from __future__ import annotations

import math
import uuid
from pathlib import Path
from typing import Any

import trimesh


class CADGeneratorService:
    """Generate deterministic CAD artifacts from structured parametric definitions."""

    def __init__(self) -> None:
        self.output_dir = Path(__file__).resolve().parents[2] / "generated"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate(self, definition: dict[str, Any]) -> dict[str, Any]:
        design_type = str(definition.get("type", "3D")).upper()

        if design_type == "2D":
            return self._generate_2d(definition)

        return self._generate_3d(definition)

    def _generate_3d(self, definition: dict[str, Any]) -> dict[str, Any]:
        model = str(definition.get("model", "bracket")).lower()
        parameters = definition.get("parameters", {}) or {}

        if model == "bracket":
            mesh, feature_tree, warnings = self._build_bracket(parameters)
        else:
            mesh, feature_tree, warnings = self._build_generic_block(model, parameters)

        model_id = uuid.uuid4().hex
        stl_name = f"{model}_{model_id}.stl"
        stl_path = self.output_dir / stl_name
        mesh.export(stl_path)

        bbox = mesh.bounds
        return {
            "type": "3D",
            "model": model,
            "stl_path": str(stl_path),
            "stl_url": f"/generated/{stl_name}",
            "bounding_box": {
                "min_x": float(bbox[0][0]),
                "min_y": float(bbox[0][1]),
                "min_z": float(bbox[0][2]),
                "max_x": float(bbox[1][0]),
                "max_y": float(bbox[1][1]),
                "max_z": float(bbox[1][2]),
            },
            "feature_tree": feature_tree,
            "operations": definition.get("operations", []),
            "mesh": mesh,
            "warnings": warnings,
        }

    def _build_bracket(self, parameters: dict[str, Any]) -> tuple[trimesh.Trimesh, list[dict[str, Any]], list[str]]:
        warnings: list[str] = []

        base = parameters.get("base_plate", {})
        wall = parameters.get("vertical_wall", {})
        holes = parameters.get("holes", []) or []

        width = max(10.0, float(base.get("width", 60)))
        height = max(10.0, float(base.get("height", 40)))
        thickness = max(2.0, float(base.get("thickness", 5)))

        wall_height = max(10.0, float(wall.get("height", 50)))
        wall_thickness = max(2.0, float(wall.get("thickness", 5)))

        base_mesh = trimesh.creation.box(extents=[width, height, thickness])
        base_mesh.apply_translation([0, 0, thickness / 2.0])

        wall_mesh = trimesh.creation.box(extents=[width, wall_thickness, wall_height])
        wall_mesh.apply_translation([0, (height / 2.0) - (wall_thickness / 2.0), thickness + wall_height / 2.0])

        mesh = trimesh.util.concatenate([base_mesh, wall_mesh])

        cutters: list[trimesh.Trimesh] = []
        for index, hole in enumerate(holes):
            diameter = max(1.0, float(hole.get("diameter", 6)))
            radius = diameter / 2.0
            position = hole.get("position", [width / 2.0, height / 2.0])
            if not isinstance(position, list) or len(position) < 2:
                warnings.append(f"Hole {index + 1} has invalid position and was skipped")
                continue

            local_x = float(position[0]) - (width / 2.0)
            local_y = float(position[1]) - (height / 2.0)

            if abs(local_x) > (width / 2.0 - radius) or abs(local_y) > (height / 2.0 - radius):
                warnings.append(f"Hole {index + 1} lies outside base plate bounds and was skipped")
                continue

            cutter = trimesh.creation.cylinder(radius=radius, height=thickness + 2.0, sections=48)
            cutter.apply_translation([local_x, local_y, (thickness / 2.0)])
            cutters.append(cutter)

        if cutters:
            try:
                merged_cutters = trimesh.util.concatenate(cutters)
                diff = trimesh.boolean.difference([mesh, merged_cutters])
                if isinstance(diff, list):
                    mesh = trimesh.util.concatenate(diff)
                elif isinstance(diff, trimesh.Trimesh):
                    mesh = diff
                else:
                    warnings.append("Boolean subtraction returned unexpected output; holes were not applied")
            except Exception:
                warnings.append("Boolean subtraction engine unavailable; STL generated without hole subtraction")

        feature_tree = [
            {
                "name": "Base Plate",
                "operation": "create box",
                "parameters": {
                    "width": width,
                    "height": height,
                    "thickness": thickness,
                },
            },
            {
                "name": "Vertical Wall",
                "operation": "extrude wall",
                "parameters": {
                    "height": wall_height,
                    "thickness": wall_thickness,
                },
            },
        ]

        if holes:
            feature_tree.append(
                {
                    "name": "Holes",
                    "operation": "boolean subtraction",
                    "parameters": {"count": len(holes), "holes": holes},
                }
            )

        mesh.process(validate=True)
        return mesh, feature_tree, warnings

    def _build_generic_block(self, model: str, parameters: dict[str, Any]) -> tuple[trimesh.Trimesh, list[dict[str, Any]], list[str]]:
        width = max(10.0, float(parameters.get("width", 80)))
        height = max(10.0, float(parameters.get("height", 40)))
        depth = max(10.0, float(parameters.get("depth", 30)))

        mesh = trimesh.creation.box(extents=[width, height, depth])
        mesh.apply_translation([0, 0, depth / 2.0])

        feature_tree = [
            {
                "name": f"{model.title()} Body",
                "operation": "create parametric block",
                "parameters": {
                    "width": width,
                    "height": height,
                    "depth": depth,
                },
            }
        ]

        warnings = [
            "Model type not explicitly implemented; generated constrained parametric block as engineering-safe fallback"
        ]
        return mesh, feature_tree, warnings

    def _generate_2d(self, definition: dict[str, Any]) -> dict[str, Any]:
        shapes = definition.get("shapes", []) or []
        if not shapes:
            shapes = [
                {"type": "rectangle", "width": 60, "height": 40, "position": [20, 20]},
                {"type": "circle", "radius": 5, "position": [50, 40]},
            ]

        svg_width = 400
        svg_height = 300
        entities: list[str] = []
        feature_tree: list[dict[str, Any]] = []

        for index, shape in enumerate(shapes):
            shape_type = str(shape.get("type", "")).lower()

            if shape_type == "rectangle":
                width = max(1.0, float(shape.get("width", 10)))
                height = max(1.0, float(shape.get("height", 10)))
                position = shape.get("position", [20, 20])
                x = float(position[0]) if isinstance(position, list) and len(position) > 0 else 20.0
                y = float(position[1]) if isinstance(position, list) and len(position) > 1 else 20.0
                entities.append(
                    f'<rect x="{x}" y="{y}" width="{width}" height="{height}" fill="none" stroke="#38bdf8" stroke-width="2" />'
                )
                feature_tree.append({
                    "name": f"Rectangle {index + 1}",
                    "operation": "draw rectangle",
                    "parameters": {"width": width, "height": height, "position": [x, y]},
                })
            elif shape_type == "circle":
                radius = max(0.5, float(shape.get("radius", 5)))
                position = shape.get("position", [20, 20])
                cx = float(position[0]) if isinstance(position, list) and len(position) > 0 else 20.0
                cy = float(position[1]) if isinstance(position, list) and len(position) > 1 else 20.0
                entities.append(
                    f'<circle cx="{cx}" cy="{cy}" r="{radius}" fill="none" stroke="#f97316" stroke-width="2" />'
                )
                feature_tree.append({
                    "name": f"Circle {index + 1}",
                    "operation": "draw circle",
                    "parameters": {"radius": radius, "position": [cx, cy]},
                })

        svg_content = (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{svg_width}" height="{svg_height}" viewBox="0 0 {svg_width} {svg_height}">'
            '<rect x="0" y="0" width="100%" height="100%" fill="#0f172a" />'
            + "".join(entities)
            + "</svg>"
        )

        model_id = uuid.uuid4().hex
        svg_name = f"drawing_{model_id}.svg"
        svg_path = self.output_dir / svg_name
        svg_path.write_text(svg_content, encoding="utf-8")

        return {
            "type": "2D",
            "model": str(definition.get("model", "drawing")),
            "svg_path": str(svg_path),
            "svg_url": f"/generated/{svg_name}",
            "feature_tree": feature_tree,
            "operations": definition.get("operations", []),
            "shapes": shapes,
            "canvas": {"width": svg_width, "height": svg_height},
            "warnings": [],
        }
