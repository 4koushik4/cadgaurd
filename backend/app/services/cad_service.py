from __future__ import annotations

import tempfile
from pathlib import Path

import numpy as np
import trimesh
from scipy.spatial import cKDTree
from starlette.datastructures import UploadFile

from app.core.errors import CADGuardError
from app.schemas.models import GeometryStats


class CADService:
    SUPPORTED_EXTENSIONS = {".stl", ".obj"}

    def load_mesh_from_upload(self, upload_file: UploadFile) -> trimesh.Trimesh:
        extension = Path(upload_file.filename or "").suffix.lower()
        if extension not in self.SUPPORTED_EXTENSIONS:
            raise CADGuardError("Only STL and OBJ files are supported for backend processing", 400)

        file_bytes = upload_file.file.read()
        if not file_bytes:
            raise CADGuardError("Uploaded CAD file is empty", 400)

        # On Windows, reopening NamedTemporaryFile can fail while the handle is still open.
        # Write into a temp directory and load from a regular path instead.
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir) / f"upload{extension}"
            temp_path.write_bytes(file_bytes)
            loaded = trimesh.load(str(temp_path), force="mesh")

        if isinstance(loaded, trimesh.Scene):
            if not loaded.geometry:
                raise CADGuardError("CAD scene has no mesh geometry", 400)
            loaded = trimesh.util.concatenate(tuple(loaded.geometry.values()))

        if not isinstance(loaded, trimesh.Trimesh):
            raise CADGuardError("Could not parse CAD mesh", 400)

        if loaded.vertices.shape[0] < 4 or loaded.faces.shape[0] < 4:
            raise CADGuardError("Mesh is too small for validation/simulation", 400)

        return loaded

    def extract_geometry_stats(self, mesh: trimesh.Trimesh) -> GeometryStats:
        bbox = mesh.bounds
        extents = (bbox[1] - bbox[0]).tolist()

        volume = float(mesh.volume) if mesh.is_volume else 0.0
        surface_area = float(mesh.area)

        non_manifold_edges = self._count_non_manifold_edges(mesh)
        inconsistent_normals = not bool(mesh.is_winding_consistent)

        estimated_wall_thickness = self._estimate_wall_thickness(mesh, volume, surface_area)

        return GeometryStats(
            vertices=int(mesh.vertices.shape[0]),
            faces=int(mesh.faces.shape[0]),
            bounding_box_min=bbox[0].astype(float).tolist(),
            bounding_box_max=bbox[1].astype(float).tolist(),
            extents=[float(v) for v in extents],
            volume=volume,
            surface_area=surface_area,
            is_watertight=bool(mesh.is_watertight),
            estimated_wall_thickness_mm=estimated_wall_thickness,
            non_manifold_edges=non_manifold_edges,
            inconsistent_normals=inconsistent_normals,
        )

    def _count_non_manifold_edges(self, mesh: trimesh.Trimesh) -> int:
        faces = mesh.faces
        edges = np.vstack(
            [
                np.sort(faces[:, [0, 1]], axis=1),
                np.sort(faces[:, [1, 2]], axis=1),
                np.sort(faces[:, [2, 0]], axis=1),
            ]
        )

        edges_view = np.ascontiguousarray(edges).view([("v0", edges.dtype), ("v1", edges.dtype)])
        _, counts = np.unique(edges_view, return_counts=True)
        return int(np.sum(counts > 2))

    def _estimate_wall_thickness(self, mesh: trimesh.Trimesh, volume: float, surface_area: float) -> float:
        if surface_area <= 1e-9:
            return 0.0

        char_thickness = (2.0 * max(volume, 0.0)) / surface_area

        vertices = np.asarray(mesh.vertices)
        if vertices.shape[0] < 12:
            return round(max(char_thickness, 0.0), 4)

        sample_size = min(2000, vertices.shape[0])
        sample_indices = np.random.default_rng(42).choice(vertices.shape[0], sample_size, replace=False)
        sampled = vertices[sample_indices]

        tree = cKDTree(vertices)
        distances, _ = tree.query(sampled, k=3)
        nearest_nonzero = distances[:, 2]
        local_scale = float(np.median(nearest_nonzero)) if nearest_nonzero.size else 0.0

        estimate = max(char_thickness, local_scale * 0.8)
        return round(float(estimate), 4)

    def generate_section_view(self, mesh: trimesh.Trimesh, plane_normal: list[float], plane_point: list[float] | None = None) -> dict:
        """Generate a cross-section of the mesh at a given plane."""
        if plane_point is None:
            # Default to center of mesh
            center = mesh.centroid
            plane_point = center

        normal = np.array(plane_normal)
        origin = np.array(plane_point)

        # Slice the mesh
        section = mesh.section(plane_origin=origin, plane_normal=normal)

        if section is None or len(section.entities) == 0:
            return {"success": False, "message": "No intersection with mesh"}

        result = {
            "success": True,
            "section_count": len(section.entities),
            "properties": {}
        }

        # If section has paths, extract geometry
        if hasattr(section, 'discrete'):
            paths = section.discrete
            for i, path in enumerate(paths):
                if len(path) > 0:
                    result["properties"][f"path_{i}"] = {
                        "vertices": path.tolist() if hasattr(path, 'tolist') else path,
                        "length": float(np.sum(np.linalg.norm(np.diff(path, axis=0), axis=1)))
                    }

        return result

    def detect_holes(self, mesh: trimesh.Trimesh) -> dict:
        """Detect holes/cavities in the mesh."""
        # Use the convex hull to find cavities
        if not mesh.is_watertight:
            return {
                "has_cavities": False,
                "message": "Mesh is not watertight - cannot reliably detect cavities"
            }

        convex = mesh.convex_hull

        # Calculate volume difference
        volume_diff = convex.volume - mesh.volume

        holes_detected = volume_diff > (mesh.volume * 0.05)  # More than 5% difference

        return {
            "has_cavities": holes_detected,
            "cavity_volume": float(volume_diff),
            "cavity_percentage": float((volume_diff / convex.volume * 100) if convex.volume > 0 else 0),
            "convex_volume": float(convex.volume),
            "mesh_volume": float(mesh.volume)
        }

    def repair_mesh(self, mesh: trimesh.Trimesh, remove_unreferenced: bool = True,
                   merge_duplicates: bool = True, fix_normals: bool = True) -> tuple[trimesh.Trimesh, dict]:
        """Repair common mesh issues."""
        issues_fixed = []
        original_faces = len(mesh.faces)
        original_vertices = len(mesh.vertices)

        # Remove unreferenced vertices
        if remove_unreferenced:
            before = len(mesh.vertices)
            mesh.remove_unreferenced_vertices()
            if len(mesh.vertices) < before:
                issues_fixed.append(f"Removed {before - len(mesh.vertices)} unreferenced vertices")

        # Merge duplicate vertices
        if merge_duplicates:
            before = len(mesh.vertices)
            mesh.merge_vertices()
            if len(mesh.vertices) < before:
                issues_fixed.append(f"Merged {before - len(mesh.vertices)} duplicate vertices")

        # Fix normals
        if fix_normals and not mesh.is_winding_consistent:
            mesh.fix_normals()
            issues_fixed.append("Fixed inconsistent normals")

        return mesh, {
            "success": True,
            "issues_fixed": issues_fixed,
            "vertices_removed": original_vertices - len(mesh.vertices),
            "faces_removed": original_faces - len(mesh.faces),
            "is_watertight_before": len(issues_fixed) > 0,
            "is_watertight_after": mesh.is_watertight
        }

    def measure_distance(self, mesh: trimesh.Trimesh, point1: list[float], point2: list[float]) -> dict:
        """Measure distance between two points."""
        p1 = np.array(point1)
        p2 = np.array(point2)

        distance = float(np.linalg.norm(p2 - p1))

        return {
            "distance": distance,
            "point1": point1,
            "point2": point2,
            "units": "mm"
        }

    def measure_angle(self, vector1: list[float], vector2: list[float]) -> dict:
        """Measure angle between two vectors."""
        v1 = np.array(vector1)
        v2 = np.array(vector2)

        # Normalize vectors
        v1_norm = v1 / np.linalg.norm(v1)
        v2_norm = v2 / np.linalg.norm(v2)

        # Calculate angle
        cos_angle = np.clip(np.dot(v1_norm, v2_norm), -1.0, 1.0)
        angle_rad = float(np.arccos(cos_angle))
        angle_deg = float(np.degrees(angle_rad))

        return {
            "angle_degrees": angle_deg,
            "angle_radians": angle_rad,
            "vector1": vector1,
            "vector2": vector2
        }

    def detect_sharp_edges(self, mesh: trimesh.Trimesh, angle_threshold: float = 20.0) -> dict:
        """Detect sharp edges in the mesh."""
        # Calculate face normals
        face_normals = mesh.face_normals
        faces = mesh.faces

        sharp_edges = []
        angle_threshold_rad = np.radians(angle_threshold)

        # For each edge, check angle between adjacent faces
        for edge_idx in range(len(mesh.edges_unique)):
            vertices = mesh.edges_unique[edge_idx]

            # Find faces sharing this edge
            faces_with_edge = []
            for face_idx, face in enumerate(faces):
                if vertices[0] in face and vertices[1] in face:
                    faces_with_edge.append(face_idx)

            if len(faces_with_edge) == 2:
                # Calculate angle between face normals
                n1 = face_normals[faces_with_edge[0]]
                n2 = face_normals[faces_with_edge[1]]

                cos_angle = np.clip(np.dot(n1, n2), -1.0, 1.0)
                angle = np.arccos(cos_angle)

                if angle > angle_threshold_rad:
                    sharp_edges.append({
                        "edge": vertices.tolist(),
                        "angle_degrees": float(np.degrees(angle)),
                        "vertex_count": 2
                    })

        return {
            "sharp_edges_count": len(sharp_edges),
            "threshold_degrees": angle_threshold,
            "sharp_edges": sharp_edges[:10]  # Return top 10
        }

    def calculate_surface_features(self, mesh: trimesh.Trimesh) -> dict:
        """Calculate advanced surface features."""
        # Calculate principal curvatures (simple approximation)
        vertices = mesh.vertices
        vertex_normals = mesh.vertex_normals

        # Calculate average distance to neighboring vertices
        edges = mesh.edges_unique
        vertex_neighbors = [[] for _ in range(len(vertices))]

        for edge in edges:
            v0, v1 = edge
            vertex_neighbors[v0].append(v1)
            vertex_neighbors[v1].append(v0)

        avg_edge_length = 0.0
        edge_count = 0

        for edge in edges:
            v0, v1 = edge
            dist = np.linalg.norm(vertices[v1] - vertices[v0])
            avg_edge_length += dist
            edge_count += 1

        avg_edge_length = avg_edge_length / max(1, edge_count)

        return {
            "average_edge_length": float(avg_edge_length),
            "total_edges": int(len(mesh.edges_unique)),
            "euler_characteristic": int(mesh.euler_number),
            "genus": int((2 - mesh.euler_number) // 2) if mesh.euler_number else 0,
            "is_manifold": bool(mesh.is_watertight),
            "triangles": int(len(mesh.faces))
        }
