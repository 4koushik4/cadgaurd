from __future__ import annotations

import json
import logging
from typing import Any

from groq import Groq

from app.core.config import Settings

logger = logging.getLogger(__name__)


class DesignGeneratorService:
    """Generate strict parametric CAD definitions from natural language prompts."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None
        self.model = settings.groq_model or "llama3-70b-8192"

    def generate_definition(self, user_prompt: str, design_type: str = "auto") -> dict[str, Any]:
        if not self.client:
            logger.warning("Groq API key not configured; using deterministic fallback CAD definition")
            return self._fallback_definition(user_prompt, design_type)

        system_prompt = (
            "You are a professional mechanical design engineer.\n\n"
            "Generate a precise parametric CAD design.\n"
            "Do NOT describe loosely.\n"
            "Return structured JSON with dimensions, features, and operations.\n\n"
            "Ensure:\n"
            "- Realistic engineering proportions\n"
            "- Functional design\n"
            "- Manufacturable geometry\n\n"
            "Strict output format:\n"
            "For 3D:\n"
            "{\n"
            "  \"type\": \"3D\",\n"
            "  \"model\": \"bracket\",\n"
            "  \"parameters\": {\n"
            "    \"base_plate\": {\"width\": number, \"height\": number, \"thickness\": number},\n"
            "    \"vertical_wall\": {\"height\": number, \"thickness\": number},\n"
            "    \"holes\": [{\"diameter\": number, \"position\": [number, number]}]\n"
            "  },\n"
            "  \"operations\": [string]\n"
            "}\n\n"
            "For 2D:\n"
            "{\n"
            "  \"type\": \"2D\",\n"
            "  \"model\": \"drawing\",\n"
            "  \"shapes\": [\n"
            "    {\"type\": \"rectangle\", \"width\": number, \"height\": number, \"position\": [number, number]},\n"
            "    {\"type\": \"circle\", \"radius\": number, \"position\": [number, number]}\n"
            "  ],\n"
            "  \"operations\": [string]\n"
            "}\n\n"
            "Respond with JSON only and no markdown."
        )

        user_message = (
            f"User request:\n{user_prompt}\n\n"
            f"Preferred design type: {design_type}\n"
            "Generate production-grade parametric CAD JSON now."
        )

        try:
            completion = self.client.chat.completions.create(
                model=self.model,
                temperature=0.2,
                max_tokens=1400,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
            )
            content = (completion.choices[0].message.content or "{}").strip()
            parsed = self._parse_json(content)
            normalized = self._normalize_definition(parsed, user_prompt, design_type)
            return normalized
        except Exception as exc:
            logger.warning("AI definition generation failed, using fallback: %s", exc)
            return self._fallback_definition(user_prompt, design_type)

    def generate_design(self, user_prompt: str, design_type: str = "auto") -> dict[str, Any]:
        """Compatibility wrapper used by existing routes."""
        return self.generate_definition(user_prompt, design_type)

    def convert_to_3d_primitives(self, definition: dict[str, Any]) -> dict[str, Any]:
        """Legacy route support. Returns deterministic metadata, not random primitives."""
        if str(definition.get("type", "3D")).upper() != "3D":
            return {
                "primitives": [],
                "total_primitives": 0,
                "bounding_box": {
                    "min_x": 0.0,
                    "min_y": 0.0,
                    "min_z": 0.0,
                    "max_x": 0.0,
                    "max_y": 0.0,
                    "max_z": 0.0,
                },
                "rendering_notes": "Definition is 2D",
            }

        params = definition.get("parameters", {}) or {}
        base = params.get("base_plate", {})
        wall = params.get("vertical_wall", {})
        width = float(base.get("width", 60))
        height = float(base.get("height", 40))
        thickness = float(base.get("thickness", 5))
        wall_height = float(wall.get("height", 50))

        return {
            "primitives": [],
            "total_primitives": 0,
            "bounding_box": {
                "min_x": -width / 2.0,
                "min_y": -height / 2.0,
                "min_z": 0.0,
                "max_x": width / 2.0,
                "max_y": height / 2.0,
                "max_z": thickness + wall_height,
            },
            "rendering_notes": "Use STL output for real mesh rendering",
        }

    def convert_to_2d_shapes(self, definition: dict[str, Any]) -> dict[str, Any]:
        if str(definition.get("type", "3D")).upper() == "2D":
            shapes = definition.get("shapes", []) or []
        else:
            params = definition.get("parameters", {}) or {}
            base = params.get("base_plate", {})
            width = float(base.get("width", 60))
            height = float(base.get("height", 40))
            shapes = [
                {"type": "rectangle", "x": 20, "y": 20, "width": width, "height": height, "color": "#38bdf8", "stroke": "#38bdf8", "stroke_width": 2}
            ]

        normalized = []
        for shape in shapes:
            if shape.get("type") == "rectangle":
                pos = shape.get("position", [shape.get("x", 20), shape.get("y", 20)])
                normalized.append({
                    "type": "rectangle",
                    "x": float(pos[0]),
                    "y": float(pos[1]),
                    "width": float(shape.get("width", 10)),
                    "height": float(shape.get("height", 10)),
                    "color": "none",
                    "stroke": "#38bdf8",
                    "stroke_width": 2,
                })
            elif shape.get("type") == "circle":
                pos = shape.get("position", [shape.get("cx", 20), shape.get("cy", 20)])
                normalized.append({
                    "type": "circle",
                    "cx": float(pos[0]),
                    "cy": float(pos[1]),
                    "r": float(shape.get("radius", shape.get("r", 5))),
                    "color": "none",
                    "stroke": "#f97316",
                    "stroke_width": 2,
                })

        return {
            "shapes": normalized,
            "total_shapes": len(normalized),
            "canvas_size": {"width": 400, "height": 300},
            "rendering_notes": "Parametric 2D layout",
        }

    def generate_export_formats(self, definition: dict[str, Any]) -> dict[str, Any]:
        design_type = str(definition.get("type", "3D")).upper()
        if design_type == "3D":
            formats = [
                {"format": "STL", "description": "Triangulated manufacturing mesh", "recommended": True, "file_extension": ".stl"},
                {"format": "OBJ", "description": "Mesh for rendering pipelines", "recommended": False, "file_extension": ".obj"},
            ]
        else:
            formats = [
                {"format": "SVG", "description": "2D vector drawing", "recommended": True, "file_extension": ".svg"},
                {"format": "DXF", "description": "CAD exchange format", "recommended": False, "file_extension": ".dxf"},
            ]

        return {
            "recommended_formats": formats,
            "design_type": design_type,
            "notes": "Generated from deterministic parametric definition",
        }

    def _parse_json(self, content: str) -> dict[str, Any]:
        payload = content
        if payload.startswith("```"):
            payload = payload.strip("`")
            if payload.startswith("json"):
                payload = payload[4:]
        parsed = json.loads(payload)
        if not isinstance(parsed, dict):
            raise ValueError("Expected JSON object")
        return parsed

    def _normalize_definition(self, parsed: dict[str, Any], user_prompt: str, design_type: str) -> dict[str, Any]:
        t = str(parsed.get("type", design_type or "3D")).upper()

        if t == "2D":
            shapes = parsed.get("shapes", [])
            if not isinstance(shapes, list):
                shapes = []

            normalized_shapes: list[dict[str, Any]] = []
            for shape in shapes:
                if not isinstance(shape, dict):
                    continue
                shape_type = str(shape.get("type", "")).lower()
                if shape_type == "rectangle":
                    normalized_shapes.append(
                        {
                            "type": "rectangle",
                            "width": max(1.0, float(shape.get("width", 10))),
                            "height": max(1.0, float(shape.get("height", 10))),
                            "position": self._ensure_pos(shape.get("position", [20, 20])),
                        }
                    )
                elif shape_type == "circle":
                    normalized_shapes.append(
                        {
                            "type": "circle",
                            "radius": max(0.5, float(shape.get("radius", 5))),
                            "position": self._ensure_pos(shape.get("position", [20, 20])),
                        }
                    )

            if not normalized_shapes:
                return self._fallback_definition(user_prompt, "2d")

            return {
                "type": "2D",
                "model": str(parsed.get("model", "drawing")),
                "shapes": normalized_shapes,
                "operations": [str(op) for op in parsed.get("operations", ["create sketch"])],
            }

        params = parsed.get("parameters", {})
        if not isinstance(params, dict):
            params = {}

        base = params.get("base_plate", {}) if isinstance(params.get("base_plate"), dict) else {}
        wall = params.get("vertical_wall", {}) if isinstance(params.get("vertical_wall"), dict) else {}
        holes = params.get("holes", []) if isinstance(params.get("holes"), list) else []

        normalized_holes: list[dict[str, Any]] = []
        for hole in holes:
            if not isinstance(hole, dict):
                continue
            normalized_holes.append(
                {
                    "diameter": max(1.0, float(hole.get("diameter", 6))),
                    "position": self._ensure_pos(hole.get("position", [20, 20])),
                }
            )

        return {
            "type": "3D",
            "model": str(parsed.get("model", "bracket")),
            "parameters": {
                "base_plate": {
                    "width": max(10.0, float(base.get("width", 60))),
                    "height": max(10.0, float(base.get("height", 40))),
                    "thickness": max(2.0, float(base.get("thickness", 5))),
                },
                "vertical_wall": {
                    "height": max(10.0, float(wall.get("height", 50))),
                    "thickness": max(2.0, float(wall.get("thickness", 5))),
                },
                "holes": normalized_holes,
            },
            "operations": [str(op) for op in parsed.get("operations", ["create base plate", "extrude vertical wall", "drill holes"])],
        }

    def _ensure_pos(self, value: Any) -> list[float]:
        if isinstance(value, list) and len(value) >= 2:
            return [float(value[0]), float(value[1])]
        return [20.0, 20.0]

    def _fallback_definition(self, user_prompt: str, design_type: str = "auto") -> dict[str, Any]:
        wants_2d = (design_type.lower() == "2d") or ("2d" in user_prompt.lower())
        if wants_2d:
            return {
                "type": "2D",
                "model": "drawing",
                "shapes": [
                    {"type": "rectangle", "width": 60, "height": 40, "position": [20, 20]},
                    {"type": "circle", "radius": 5, "position": [20, 20]},
                ],
                "operations": ["create base profile", "add circular feature"],
            }

        return {
            "type": "3D",
            "model": "bracket",
            "parameters": {
                "base_plate": {"width": 60, "height": 40, "thickness": 5},
                "vertical_wall": {"height": 50, "thickness": 5},
                "holes": [
                    {"diameter": 6, "position": [20, 20]},
                    {"diameter": 6, "position": [40, 20]},
                ],
            },
            "operations": ["create base plate", "extrude vertical wall", "drill holes"],
        }
