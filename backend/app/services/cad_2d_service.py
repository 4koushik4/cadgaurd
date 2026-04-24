from __future__ import annotations

import io
import tempfile
from pathlib import Path
from typing import Any

import numpy as np
from starlette.datastructures import UploadFile

from app.core.errors import CADGuardError

try:
    import ezdxf
except ImportError:
    ezdxf = None

try:
    from svgpathtools import svg2paths
except ImportError:
    svg2paths = None


class CAD2DService:
    """Service for handling 2D CAD files (DXF, SVG)."""
    
    SUPPORTED_EXTENSIONS = {".dxf", ".svg"}

    def load_file(self, upload_file: UploadFile) -> dict:
        """Load a 2D CAD file and extract geometry."""
        extension = Path(upload_file.filename or "").suffix.lower()
        
        if extension not in self.SUPPORTED_EXTENSIONS:
            raise CADGuardError("Only DXF and SVG files are supported for 2D processing", 400)
        
        file_bytes = upload_file.file.read()
        if not file_bytes:
            raise CADGuardError("Uploaded CAD file is empty", 400)
        
        if extension == ".dxf":
            return self._load_dxf(file_bytes)
        elif extension == ".svg":
            return self._load_svg(file_bytes)
        else:
            raise CADGuardError(f"Unsupported file format: {extension}", 400)

    def _load_dxf(self, file_bytes: bytes) -> dict:
        """Load and parse DXF file."""
        if ezdxf is None:
            raise CADGuardError("DXF support not available. Please install ezdxf.", 500)
        
        try:
            # Load DXF from bytes
            doc = ezdxf.readfile(io.BytesIO(file_bytes))
        except Exception as e:
            raise CADGuardError(f"Failed to parse DXF file: {str(e)}", 400)
        
        # Extract geometry and layers
        layers = {}
        all_entities = []
        
        msp = doc.modelspace()
        
        for entity in msp:
            entity_data = self._extract_dxf_entity(entity)
            if entity_data:
                layer_name = entity.dxf.layer if hasattr(entity.dxf, "layer") else "default"
                
                if layer_name not in layers:
                    layers[layer_name] = []
                
                layers[layer_name].append(entity_data)
                all_entities.append(entity_data)
        
        # Calculate bounding box
        bbox = self._calculate_2d_bbox(all_entities)
        
        return {
            "format": "dxf",
            "layer_count": len(layers),
            "layers": layers,
            "entity_count": len(all_entities),
            "bounding_box": bbox,
            "metadata": {
                "drawing_name": doc.filename if hasattr(doc, "filename") else "unknown",
                "units": str(doc.dxfversion) if hasattr(doc, "dxfversion") else "unknown",
            }
        }

    def _extract_dxf_entity(self, entity: Any) -> dict | None:
        """Extract data from a DXF entity."""
        entity_type = entity.dxftype()
        
        if entity_type == "LINE":
            p1 = entity.dxf.start
            p2 = entity.dxf.end
            return {
                "type": "line",
                "start": [float(p1[0]), float(p1[1])],
                "end": [float(p2[0]), float(p2[1])],
                "length": float(entity.dxf.start.distance(entity.dxf.end)),
                "color": entity.dxf.color if hasattr(entity.dxf, "color") else None,
            }
        
        elif entity_type == "CIRCLE":
            center = entity.dxf.center
            return {
                "type": "circle",
                "center": [float(center[0]), float(center[1])],
                "radius": float(entity.dxf.radius),
                "area": float(np.pi * entity.dxf.radius ** 2),
                "color": entity.dxf.color if hasattr(entity.dxf, "color") else None,
            }
        
        elif entity_type == "ARC":
            center = entity.dxf.center
            return {
                "type": "arc",
                "center": [float(center[0]), float(center[1])],
                "radius": float(entity.dxf.radius),
                "start_angle": float(entity.dxf.start_angle),
                "end_angle": float(entity.dxf.end_angle),
                "color": entity.dxf.color if hasattr(entity.dxf, "color") else None,
            }
        
        elif entity_type == "POLYLINE":
            points = [tuple(p)[:2] for p in entity.get_points()]
            return {
                "type": "polyline",
                "vertices": [[float(p[0]), float(p[1])] for p in points],
                "vertex_count": len(points),
                "is_closed": bool(entity.dxf.flags & 1),
                "color": entity.dxf.color if hasattr(entity.dxf, "color") else None,
            }
        
        elif entity_type == "LWPOLYLINE":
            points = list(entity.get_points(format="xy"))
            return {
                "type": "lwpolyline",
                "vertices": [[float(p[0]), float(p[1])] for p in points],
                "vertex_count": len(points),
                "is_closed": bool(entity.dxf.flags & 1),
                "color": entity.dxf.color if hasattr(entity.dxf, "color") else None,
            }
        
        elif entity_type == "RECTANGLE":
            p1 = entity.dxf.p1
            p2 = entity.dxf.p2
            return {
                "type": "rectangle",
                "corner1": [float(p1[0]), float(p1[1])],
                "corner2": [float(p2[0]), float(p2[1])],
                "width": float(abs(p2[0] - p1[0])),
                "height": float(abs(p2[1] - p1[1])),
                "area": float(abs(p2[0] - p1[0]) * abs(p2[1] - p1[1])),
                "color": entity.dxf.color if hasattr(entity.dxf, "color") else None,
            }
        
        elif entity_type == "TEXT":
            p = entity.dxf.insert
            return {
                "type": "text",
                "position": [float(p[0]), float(p[1])],
                "content": str(entity.dxf.text),
                "height": float(entity.dxf.height) if hasattr(entity.dxf, "height") else 0,
                "color": entity.dxf.color if hasattr(entity.dxf, "color") else None,
            }
        
        return None

    def _load_svg(self, file_bytes: bytes) -> dict:
        """Load and parse SVG file."""
        if svg2paths is None:
            raise CADGuardError("SVG support not available. Please install svgpathtools.", 500)
        
        try:
            # Decode bytes to string
            svg_string = file_bytes.decode("utf-8")
            
            # Save to temp file for svg2paths
            with tempfile.NamedTemporaryFile(mode="w", suffix=".svg", delete=False) as f:
                f.write(svg_string)
                temp_path = f.name
            
            try:
                paths, attributes = svg2paths(temp_path)
            finally:
                Path(temp_path).unlink()
            
        except Exception as e:
            raise CADGuardError(f"Failed to parse SVG file: {str(e)}", 400)
        
        # Extract path information
        all_paths = []
        for i, (path, attr) in enumerate(zip(paths, attributes)):
            path_data = {
                "type": "path",
                "index": i,
                "length": self._calculate_path_length(path),
                "attributes": attr,
                "segments": len(path),
            }
            all_paths.append(path_data)
        
        bbox = self._calculate_svg_bbox(paths)
        
        return {
            "format": "svg",
            "path_count": len(paths),
            "paths": all_paths,
            "bounding_box": bbox,
            "metadata": {
                "total_segments": sum(len(p) for p in paths),
            }
        }

    def _calculate_path_length(self, path: Any) -> float:
        """Calculate the total length of an SVG path."""
        try:
            return float(path.length())
        except:
            return 0.0

    def _calculate_2d_bbox(self, entities: list[dict]) -> dict:
        """Calculate bounding box for 2D entities."""
        if not entities:
            return {"min_x": 0, "min_y": 0, "max_x": 0, "max_y": 0}
        
        min_x = float("inf")
        max_x = float("-inf")
        min_y = float("inf")
        max_y = float("-inf")
        
        for entity in entities:
            if entity["type"] == "line":
                points = [entity["start"], entity["end"]]
            elif entity["type"] == "circle":
                center = entity["center"]
                r = entity["radius"]
                min_x = min(min_x, center[0] - r)
                max_x = max(max_x, center[0] + r)
                min_y = min(min_y, center[1] - r)
                max_y = max(max_y, center[1] + r)
                continue
            elif entity["type"] in ["polyline", "lwpolyline"]:
                points = entity["vertices"]
            elif entity["type"] == "rectangle":
                points = [entity["corner1"], entity["corner2"]]
            elif entity["type"] == "text":
                points = [entity["position"]]
            elif entity["type"] == "arc":
                center = entity["center"]
                r = entity["radius"]
                min_x = min(min_x, center[0] - r)
                max_x = max(max_x, center[0] + r)
                min_y = min(min_y, center[1] - r)
                max_y = max(max_y, center[1] + r)
                continue
            else:
                continue
            
            for point in points:
                min_x = min(min_x, point[0])
                max_x = max(max_x, point[0])
                min_y = min(min_y, point[1])
                max_y = max(max_y, point[1])
        
        return {
            "min_x": float(min_x) if min_x != float("inf") else 0,
            "min_y": float(min_y) if min_y != float("inf") else 0,
            "max_x": float(max_x) if max_x != float("-inf") else 0,
            "max_y": float(max_y) if max_y != float("-inf") else 0,
            "width": float(max_x - min_x) if max_x != float("-inf") else 0,
            "height": float(max_y - min_y) if max_y != float("-inf") else 0,
        }

    def _calculate_svg_bbox(self, paths: list[Any]) -> dict:
        """Calculate bounding box for SVG paths."""
        if not paths:
            return {"min_x": 0, "min_y": 0, "max_x": 0, "max_y": 0}
        
        try:
            bboxes = []
            for path in paths:
                try:
                    bbox = path.bbox()
                    bboxes.append(bbox)
                except:
                    pass
            
            if not bboxes:
                return {"min_x": 0, "min_y": 0, "max_x": 0, "max_y": 0}
            
            min_x = min(b[0] for b in bboxes)
            max_x = max(b[1] for b in bboxes)
            min_y = min(b[2] for b in bboxes)
            max_y = max(b[3] for b in bboxes)
            
            return {
                "min_x": float(min_x),
                "min_y": float(min_y),
                "max_x": float(max_x),
                "max_y": float(max_y),
                "width": float(max_x - min_x),
                "height": float(max_y - min_y),
            }
        except:
            return {"min_x": 0, "min_y": 0, "max_x": 0, "max_y": 0}

    def analyze_2d_geometry(self, geometry_data: dict) -> dict:
        """Analyze 2D geometry properties."""
        total_length = 0.0
        circle_count = 0
        line_count = 0
        polygon_count = 0
        total_area = 0.0
        
        all_entities = geometry_data.get("layers", {})
        if not all_entities:
            all_entities = {"all": geometry_data.get("paths", [])}
        
        # Flatten all entities
        flat_entities = []
        for layer_entities in all_entities.values():
            if isinstance(layer_entities, list):
                flat_entities.extend(layer_entities)
        
        for entity in flat_entities:
            entity_type = entity.get("type")
            
            if entity_type == "line":
                total_length += entity.get("length", 0)
                line_count += 1
            elif entity_type == "circle":
                circle_count += 1
                total_area += entity.get("area", 0)
                total_length += 2 * np.pi * entity.get("radius", 0)
            elif entity_type in ["polyline", "lwpolyline"]:
                polygon_count += 1
            elif entity_type == "path":
                total_length += entity.get("length", 0)
            elif entity_type == "rectangle":
                polygon_count += 1
                total_area += entity.get("area", 0)
        
        bbox = geometry_data.get("bounding_box", {})
        
        return {
            "total_entities": len(flat_entities),
            "lines": line_count,
            "circles": circle_count,
            "polygons": polygon_count,
            "total_perimeter": float(total_length),
            "total_area": float(total_area),
            "bounding_box": bbox,
            "complexity_score": min(100, len(flat_entities) * 5),
        }

    def validate_2d_geometry(self, geometry_data: dict) -> dict:
        """Validate 2D geometry for common issues."""
        issues = []
        
        all_entities = geometry_data.get("layers", {})
        if not all_entities:
            all_entities = {"all": geometry_data.get("paths", [])}
        
        flat_entities = []
        for layer_entities in all_entities.values():
            if isinstance(layer_entities, list):
                flat_entities.extend(layer_entities)
        
        # Check for open loops
        if flat_entities:
            polylines = [e for e in flat_entities if e.get("type") in ["polyline", "lwpolyline"]]
            for polyline in polylines:
                if not polyline.get("is_closed", False):
                    issues.append({
                        "type": "open_loop",
                        "severity": "warning",
                        "description": f"Open loop detected with {polyline.get('vertex_count', 0)} vertices",
                        "entity_type": polyline.get("type"),
                    })
        
        # Check for overlapping geometry (simplified)
        if len(flat_entities) > 1:
            # This is a simplified check - a full implementation would do actual collision detection
            entities_with_bbox = [e for e in flat_entities if "center" in e or "start" in e]
            if len(entities_with_bbox) > 1:
                # Potential overlaps
                pass
        
        # Check for missing constraints
        if flat_entities:
            unconstrained = [e for e in flat_entities if e.get("color") is None]
            if len(unconstrained) > len(flat_entities) * 0.5:
                issues.append({
                    "type": "missing_constraints",
                    "severity": "info",
                    "description": f"{len(unconstrained)} entities without color information",
                    "entity_count": len(unconstrained),
                })
        
        # Check bounding box validity
        bbox = geometry_data.get("bounding_box", {})
        if bbox:
            width = bbox.get("width", 0)
            height = bbox.get("height", 0)
            if width == 0 or height == 0:
                issues.append({
                    "type": "invalid_geometry",
                    "severity": "error",
                    "description": "Geometry has zero width or height",
                })
        
        return {
            "is_valid": len([i for i in issues if i.get("severity") == "error"]) == 0,
            "total_issues": len(issues),
            "errors": len([i for i in issues if i.get("severity") == "error"]),
            "warnings": len([i for i in issues if i.get("severity") == "warning"]),
            "info": len([i for i in issues if i.get("severity") == "info"]),
            "issues": issues,
        }

    def measure_2d_distance(self, point1: list[float], point2: list[float]) -> dict:
        """Measure distance between two 2D points."""
        p1 = np.array(point1)
        p2 = np.array(point2)
        
        distance = float(np.linalg.norm(p2 - p1))
        
        return {
            "distance": distance,
            "point1": point1,
            "point2": point2,
            "delta_x": float(p2[0] - p1[0]),
            "delta_y": float(p2[1] - p1[1]),
            "units": "mm",
        }

    def measure_2d_angle(self, vector1: list[float], vector2: list[float]) -> dict:
        """Measure angle between two 2D vectors."""
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
            "vector2": vector2,
        }
