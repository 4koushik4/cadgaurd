from __future__ import annotations

import json
import logging
from typing import Any

from groq import Groq
from pydantic import BaseModel

from app.core.config import Settings
from app.core.errors import CADGuardError

logger = logging.getLogger(__name__)


class DesignGenerationRequest(BaseModel):
    user_prompt: str
    design_type: str = "auto"  # auto, 2d, 3d


class DesignConcept(BaseModel):
    type: str  # "2d" or "3d"
    description: str
    dimensions: str
    structure: str
    recommendations: str
    rendering_hints: dict[str, Any]


class DesignGeneratorService:
    """Service for AI-powered design generation using Groq API."""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = Groq(api_key=settings.groq_api_key)
        self.model = "llama3-70b-8192"

    def generate_design(self, user_prompt: str, design_type: str = "auto") -> DesignConcept:
        """Generate a design concept using AI."""
        try:
            # Create a structured prompt for the AI
            system_prompt = """You are an expert CAD design engineer with deep knowledge of mechanical engineering, 
            product design, and manufacturing. You generate detailed design concepts for both 2D and 3D models.
            
            For each design request, you MUST respond ONLY with valid JSON (no markdown, no extra text) in this exact format:
            {
                "type": "2d" or "3d",
                "description": "detailed technical description of the design",
                "dimensions": "specific dimensions in mm",
                "structure": "structural breakdown and components",
                "recommendations": "manufacturing and assembly recommendations",
                "rendering_hints": {
                    "primary_shapes": ["list of shapes for rendering"],
                    "colors": ["hex colors"],
                    "complexity_level": "simple|moderate|complex"
                }
            }
            
            Respond ONLY with the JSON object, no other text."""
            
            user_message = f"""Design Request: {user_prompt}
            
            Preferred type: {design_type if design_type != 'auto' else 'auto-detect based on the description'}
            
            Generate a complete design concept with all required fields in valid JSON format."""
            
            response = self.client.messages.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt,
                    },
                    {
                        "role": "user",
                        "content": user_message,
                    }
                ],
                temperature=0.7,
                max_tokens=1024,
            )
            
            # Extract the response content
            content = response.choices[0].message.content.strip()
            
            # Try to parse as JSON
            try:
                # Remove markdown code blocks if present
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                content = content.strip()
                
                design_data = json.loads(content)
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse AI response as JSON: {e}")
                # Provide a fallback response
                design_data = self._create_fallback_response(user_prompt)
            
            return DesignConcept(**design_data)
        
        except Exception as e:
            logger.error(f"Error generating design with Groq: {str(e)}")
            raise CADGuardError(f"Failed to generate design: {str(e)}", 500)

    def _create_fallback_response(self, user_prompt: str) -> dict[str, Any]:
        """Create a fallback response when AI parsing fails."""
        return {
            "type": "3d" if "3d" not in user_prompt.lower() else "3d",
            "description": f"Design based on: {user_prompt[:100]}",
            "dimensions": "50x50x50 mm (estimated)",
            "structure": "Single component structure with basic geometry",
            "recommendations": "Standard manufacturing process recommended",
            "rendering_hints": {
                "primary_shapes": ["cube"],
                "colors": ["#00f0ff"],
                "complexity_level": "simple"
            }
        }

    def convert_to_3d_primitives(self, design: DesignConcept) -> dict[str, Any]:
        """Convert design concept to 3D primitive shapes."""
        if design.type == "2d":
            return {
                "primitives": [],
                "message": "Design is 2D, converting to 2D rendering instead"
            }
        
        # Extract hints about what shapes to use
        hints = design.rendering_hints
        primary_shapes = hints.get("primary_shapes", ["cube"])
        colors = hints.get("colors", ["#00f0ff"])
        
        primitives = []
        
        # Generate primitives based on description and hints
        for i, shape_type in enumerate(primary_shapes[:5]):  # Limit to 5 shapes
            color = colors[i % len(colors)]
            
            primitive = self._create_primitive(shape_type, color, i)
            if primitive:
                primitives.append(primitive)
        
        # If no primitives generated, create a default cube
        if not primitives:
            primitives.append(self._create_primitive("cube", colors[0], 0))
        
        return {
            "primitives": primitives,
            "total_primitives": len(primitives),
            "bounding_box": self._estimate_bounding_box(primitives),
            "rendering_notes": f"Design type: {design.type}, Complexity: {hints.get('complexity_level', 'moderate')}"
        }

    def _create_primitive(self, shape_type: str, color: str, index: int) -> dict[str, Any] | None:
        """Create a primitive shape."""
        shape_type = shape_type.lower().strip()
        
        # Position offset based on index
        offset_x = (index % 3) * 30
        offset_y = (index // 3) * 30
        
        if shape_type in ["cube", "box"]:
            return {
                "type": "cube",
                "position": [offset_x, offset_y, 0],
                "scale": [20, 20, 20],
                "color": color,
                "rotation": [0, 0, 0]
            }
        
        elif shape_type in ["sphere", "ball"]:
            return {
                "type": "sphere",
                "position": [offset_x, offset_y, 15],
                "radius": 10,
                "color": color
            }
        
        elif shape_type in ["cylinder", "pipe", "tube"]:
            return {
                "type": "cylinder",
                "position": [offset_x, offset_y, 0],
                "radius": 8,
                "height": 30,
                "color": color,
                "rotation": [0, 0, 0]
            }
        
        elif shape_type in ["cone"]:
            return {
                "type": "cone",
                "position": [offset_x, offset_y, 0],
                "radius": 10,
                "height": 30,
                "color": color,
                "rotation": [0, 0, 0]
            }
        
        elif shape_type in ["torus", "ring"]:
            return {
                "type": "torus",
                "position": [offset_x, offset_y, 15],
                "major_radius": 12,
                "minor_radius": 4,
                "color": color,
                "rotation": [0, 0, 0]
            }
        
        elif shape_type in ["bracket", "support", "clamp"]:
            return {
                "type": "cube",
                "position": [offset_x, offset_y, 0],
                "scale": [15, 25, 10],
                "color": color,
                "rotation": [0, 0, 0]
            }
        
        elif shape_type in ["plate", "flat", "board"]:
            return {
                "type": "cube",
                "position": [offset_x, offset_y, 0],
                "scale": [30, 30, 2],
                "color": color,
                "rotation": [0, 0, 0]
            }
        
        elif shape_type in ["gear"]:
            return {
                "type": "cylinder",
                "position": [offset_x, offset_y, 0],
                "radius": 15,
                "height": 5,
                "color": color,
                "rotation": [0, 0, 0]
            }
        
        return None

    def _estimate_bounding_box(self, primitives: list[dict]) -> dict[str, float]:
        """Estimate bounding box from primitives."""
        if not primitives:
            return {"min_x": 0, "min_y": 0, "min_z": 0, "max_x": 100, "max_y": 100, "max_z": 100}
        
        min_x = min(p.get("position", [0])[0] - self._get_primitive_size(p) for p in primitives)
        max_x = max(p.get("position", [0])[0] + self._get_primitive_size(p) for p in primitives)
        min_y = min(p.get("position", [0, 0])[1] - self._get_primitive_size(p) for p in primitives)
        max_y = max(p.get("position", [0, 0])[1] + self._get_primitive_size(p) for p in primitives)
        min_z = min(p.get("position", [0, 0, 0])[2] - self._get_primitive_size(p) for p in primitives)
        max_z = max(p.get("position", [0, 0, 0])[2] + self._get_primitive_size(p) + 30 for p in primitives)
        
        return {
            "min_x": float(min_x),
            "min_y": float(min_y),
            "min_z": float(min_z),
            "max_x": float(max_x),
            "max_y": float(max_y),
            "max_z": float(max_z),
        }

    def _get_primitive_size(self, primitive: dict) -> float:
        """Get approximate size of a primitive."""
        if primitive.get("type") == "cube":
            scale = primitive.get("scale", [20, 20, 20])
            return max(scale) / 2
        elif primitive.get("type") == "sphere":
            return primitive.get("radius", 10)
        elif primitive.get("type") == "cylinder":
            return primitive.get("radius", 8)
        elif primitive.get("type") == "cone":
            return primitive.get("radius", 10)
        elif primitive.get("type") == "torus":
            return primitive.get("major_radius", 12)
        return 15

    def convert_to_2d_shapes(self, design: DesignConcept) -> dict[str, Any]:
        """Convert design concept to 2D shapes."""
        if design.type == "3d":
            # Convert 3D concept to 2D projection
            shapes = self._project_3d_to_2d(design)
        else:
            shapes = self._parse_2d_design(design)
        
        return {
            "shapes": shapes,
            "total_shapes": len(shapes),
            "canvas_size": {"width": 400, "height": 300},
            "rendering_notes": f"2D Design: {design.description[:100]}"
        }

    def _project_3d_to_2d(self, design: DesignConcept) -> list[dict]:
        """Project 3D design concept to 2D."""
        hints = design.rendering_hints
        primary_shapes = hints.get("primary_shapes", ["cube"])
        colors = hints.get("colors", ["#00f0ff"])
        
        shapes = []
        
        for i, shape_type in enumerate(primary_shapes[:5]):
            color = colors[i % len(colors)]
            shape = self._create_2d_shape(shape_type, color, i)
            if shape:
                shapes.append(shape)
        
        # Add a default rectangle if no shapes generated
        if not shapes:
            shapes.append({
                "type": "rectangle",
                "x": 50,
                "y": 50,
                "width": 150,
                "height": 100,
                "color": colors[0],
                "stroke": "#888",
                "stroke_width": 1
            })
        
        return shapes

    def _create_2d_shape(self, shape_type: str, color: str, index: int) -> dict | None:
        """Create a 2D shape."""
        shape_type = shape_type.lower().strip()
        offset_x = (index % 3) * 60 + 50
        offset_y = (index // 3) * 60 + 50
        
        if shape_type in ["cube", "box", "square", "rectangle"]:
            return {
                "type": "rectangle",
                "x": offset_x,
                "y": offset_y,
                "width": 50,
                "height": 50,
                "color": color,
                "stroke": "#888",
                "stroke_width": 1
            }
        
        elif shape_type in ["sphere", "circle", "ball"]:
            return {
                "type": "circle",
                "cx": offset_x,
                "cy": offset_y,
                "r": 25,
                "color": color,
                "stroke": "#888",
                "stroke_width": 1
            }
        
        elif shape_type in ["cylinder", "pipe", "tube", "gear"]:
            return {
                "type": "circle",
                "cx": offset_x,
                "cy": offset_y,
                "r": 20,
                "color": color,
                "stroke": "#888",
                "stroke_width": 2
            }
        
        elif shape_type in ["cone"]:
            return {
                "type": "polygon",
                "points": f"{offset_x},{offset_y - 30} {offset_x - 20},{offset_y + 20} {offset_x + 20},{offset_y + 20}",
                "color": color,
                "stroke": "#888",
                "stroke_width": 1
            }
        
        elif shape_type in ["bracket", "support", "clamp"]:
            # L-shaped bracket
            return {
                "type": "path",
                "d": f"M {offset_x} {offset_y} L {offset_x + 30} {offset_y} L {offset_x + 30} {offset_y + 10} L {offset_x + 10} {offset_y + 10} L {offset_x + 10} {offset_y + 30} L {offset_x} {offset_y + 30} Z",
                "color": color,
                "stroke": "#888",
                "stroke_width": 1
            }
        
        return None

    def _parse_2d_design(self, design: DesignConcept) -> list[dict]:
        """Parse 2D design description into shapes."""
        # Extract numbers and keywords from description
        shapes = []
        description = design.description.lower()
        
        # Look for common 2D shape references
        shape_keywords = {
            "rectangle": ["rectangle", "rect", "square", "box"],
            "circle": ["circle", "round", "hole"],
            "triangle": ["triangle", "truss"],
            "line": ["line", "edge", "border"],
        }
        
        y_offset = 50
        for shape_name, keywords in shape_keywords.items():
            if any(keyword in description for keyword in keywords):
                if shape_name == "rectangle":
                    shapes.append({
                        "type": "rectangle",
                        "x": 50,
                        "y": y_offset,
                        "width": 100,
                        "height": 60,
                        "color": "#00f0ff",
                        "stroke": "#888",
                        "stroke_width": 1
                    })
                elif shape_name == "circle":
                    shapes.append({
                        "type": "circle",
                        "cx": 150,
                        "cy": y_offset + 30,
                        "r": 30,
                        "color": "#8a2eff",
                        "stroke": "#888",
                        "stroke_width": 1
                    })
                y_offset += 80
        
        if not shapes:
            # Default fallback shape
            shapes.append({
                "type": "rectangle",
                "x": 50,
                "y": 50,
                "width": 200,
                "height": 150,
                "color": "#00f0ff",
                "stroke": "#888",
                "stroke_width": 2
            })
        
        return shapes

    def generate_export_formats(self, design: DesignConcept) -> dict[str, Any]:
        """Generate export format recommendations."""
        export_formats = []
        
        if design.type == "3d":
            export_formats = [
                {
                    "format": "STL",
                    "description": "3D model for 3D printing or CAD software",
                    "recommended": True,
                    "file_extension": ".stl"
                },
                {
                    "format": "OBJ",
                    "description": "3D object file for rendering and modeling",
                    "recommended": True,
                    "file_extension": ".obj"
                },
                {
                    "format": "STEP",
                    "description": "Standard CAD format for professional use",
                    "recommended": True,
                    "file_extension": ".step"
                }
            ]
        else:
            export_formats = [
                {
                    "format": "SVG",
                    "description": "Vector graphics for web and editing",
                    "recommended": True,
                    "file_extension": ".svg"
                },
                {
                    "format": "DXF",
                    "description": "2D CAD format for technical drawings",
                    "recommended": True,
                    "file_extension": ".dxf"
                },
                {
                    "format": "PNG",
                    "description": "Raster image for presentation",
                    "recommended": False,
                    "file_extension": ".png"
                }
            ]
        
        return {
            "recommended_formats": export_formats,
            "design_type": design.type,
            "notes": f"Design can be exported in multiple formats for different use cases"
        }
