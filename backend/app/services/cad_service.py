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
