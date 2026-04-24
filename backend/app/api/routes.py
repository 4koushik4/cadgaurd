from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.concurrency import run_in_threadpool

from app.core.config import Settings, get_settings
from app.core.errors import CADGuardError
from app.schemas.models import (
    AICopilotRequest,
    AICopilotResponse,
    AutoFixRequest,
    AutoFixResponse,
    ChatbotRequest,
    ChatbotResponse,
    HealthResponse,
    SimulateResponse,
    ValidateResponse,
    SectionViewResponse,
    HoleDetectionResult,
    MeshRepairResult,
    MeasurementResult,
    SharpEdgeDetectionResult,
    SurfaceFeatures,
    CAD2DFileResponse,
    Geometry2DAnalysis,
    Geometry2DValidation,
    Measurement2D,
    DesignGenerationInput,
    AIDesignConcept,
    Design3DRendering,
    Design2DRendering,
    CompleteDesignResponse,
)
from app.services.ai_copilot import AICopilotService
from app.services.ai_service import AIService
from app.services.cad_service import CADService
from app.services.cad_2d_service import CAD2DService
from app.services.cad_generator import CADGeneratorService
from app.services.design_creator_service import DesignGeneratorService
from app.services.chatbot import ChatbotService
from app.services.simulation_service import SimulationService
from app.services.validation_service import ValidationService

logger = logging.getLogger(__name__)
router = APIRouter()


def get_cad_service() -> CADService:
    return CADService()


def get_cad_2d_service() -> CAD2DService:
    return CAD2DService()


def get_design_generator_service(settings: Settings = Depends(get_settings)) -> DesignGeneratorService:
    return DesignGeneratorService(settings=settings)


def get_cad_generator_service() -> CADGeneratorService:
    return CADGeneratorService()


def get_validation_service(settings: Settings = Depends(get_settings)) -> ValidationService:
    return ValidationService(settings=settings)


def get_simulation_service() -> SimulationService:
    return SimulationService()


def get_ai_service(settings: Settings = Depends(get_settings)) -> AIService:
    return AIService(settings=settings)


def get_ai_copilot_service(settings: Settings = Depends(get_settings)) -> AICopilotService:
    return AICopilotService(settings=settings)


def get_chatbot_service(settings: Settings = Depends(get_settings)) -> ChatbotService:
    return ChatbotService(settings=settings)


@router.get("/health", response_model=HealthResponse)
async def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.app_version,
    )


@router.post("/validate", response_model=ValidateResponse)
async def validate(
    file: UploadFile = File(...),
    cad_service: CADService = Depends(get_cad_service),
    validation_service: ValidationService = Depends(get_validation_service),
    ai_service: AIService = Depends(get_ai_service),
) -> ValidateResponse:
    if not file.filename:
        raise CADGuardError("File name is missing", 400)

    logger.info("Starting validation for file=%s", file.filename)

    mesh = await run_in_threadpool(cad_service.load_mesh_from_upload, file)
    geometry = await run_in_threadpool(cad_service.extract_geometry_stats, mesh)
    issues, summary = await run_in_threadpool(validation_service.run_checks, geometry)
    insight = await run_in_threadpool(ai_service.explain_validation, issues, summary)

    logger.info(
        "Validation complete file=%s issues=%s quality=%s high=%s medium=%s low=%s",
        file.filename,
        summary.total_issues,
        summary.quality_score,
        summary.high_issues,
        summary.medium_issues,
        summary.low_issues,
    )

    return ValidateResponse(
        geometry=geometry,
        validation_issues=issues,
        summary=summary,
        ai_insight=insight,
    )


@router.post("/simulate", response_model=SimulateResponse)
async def simulate(
    file: UploadFile = File(...),
    material: str = Form("aluminum_6061"),
    cad_service: CADService = Depends(get_cad_service),
    simulation_service: SimulationService = Depends(get_simulation_service),
    ai_service: AIService = Depends(get_ai_service),
) -> SimulateResponse:
    if not file.filename:
        raise CADGuardError("File name is missing", 400)

    logger.info("Starting simulation for file=%s", file.filename)

    mesh = await run_in_threadpool(cad_service.load_mesh_from_upload, file)
    geometry = await run_in_threadpool(cad_service.extract_geometry_stats, mesh)
    simulation = await run_in_threadpool(simulation_service.run_simulation, mesh, geometry, material)
    insight = await run_in_threadpool(ai_service.explain_simulation, simulation)

    logger.info(
        "Simulation complete file=%s material=%s risk=%s max_stress=%.2f",
        file.filename,
        simulation.material,
        simulation.risk_level,
        simulation.max_stress,
    )

    return SimulateResponse(
        geometry=geometry,
        simulation=simulation,
        ai_insight=insight,
    )


@router.post("/ai-copilot", response_model=AICopilotResponse)
async def ai_copilot(
    request: AICopilotRequest,
    ai_copilot_service: AICopilotService = Depends(get_ai_copilot_service),
) -> AICopilotResponse:
    logger.info("Running AI copilot analysis")
    return await run_in_threadpool(ai_copilot_service.analyze, request)


@router.post("/chatbot", response_model=ChatbotResponse)
async def chatbot(
    request: ChatbotRequest,
    chatbot_service: ChatbotService = Depends(get_chatbot_service),
) -> ChatbotResponse:
    logger.info("Running chatbot request")
    return await run_in_threadpool(chatbot_service.chat, request)


@router.post("/ai-autofix", response_model=AutoFixResponse)
async def ai_autofix(
    request: AutoFixRequest,
    chatbot_service: ChatbotService = Depends(get_chatbot_service),
) -> AutoFixResponse:
    logger.info("Running AI auto-fix suggestions")
    return await run_in_threadpool(chatbot_service.suggest_fixes, request)


# Advanced 3D Geometry Analysis Endpoints
@router.post("/geometry/section-view", response_model=SectionViewResponse)
async def section_view(
    file: UploadFile = File(...),
    plane_normal_x: float = Form(0),
    plane_normal_y: float = Form(0),
    plane_normal_z: float = Form(1),
    cad_service: CADService = Depends(get_cad_service),
) -> SectionViewResponse:
    """Generate a cross-section view of the model."""
    logger.info("Generating section view")
    mesh = await run_in_threadpool(cad_service.load_mesh_from_upload, file)
    result = await run_in_threadpool(
        cad_service.generate_section_view,
        mesh,
        [plane_normal_x, plane_normal_y, plane_normal_z],
    )
    return SectionViewResponse(**result)


@router.post("/geometry/detect-holes", response_model=HoleDetectionResult)
async def detect_holes(
    file: UploadFile = File(...),
    cad_service: CADService = Depends(get_cad_service),
) -> HoleDetectionResult:
    """Detect cavities and holes in the mesh."""
    logger.info("Detecting holes/cavities")
    mesh = await run_in_threadpool(cad_service.load_mesh_from_upload, file)
    result = await run_in_threadpool(cad_service.detect_holes, mesh)
    return HoleDetectionResult(**result)


@router.post("/geometry/repair", response_model=MeshRepairResult)
async def repair_mesh(
    file: UploadFile = File(...),
    remove_unreferenced: bool = Form(True),
    merge_duplicates: bool = Form(True),
    fix_normals: bool = Form(True),
    cad_service: CADService = Depends(get_cad_service),
) -> MeshRepairResult:
    """Repair common mesh issues."""
    logger.info("Repairing mesh")
    mesh = await run_in_threadpool(cad_service.load_mesh_from_upload, file)
    repaired_mesh, result = await run_in_threadpool(
        cad_service.repair_mesh, mesh, remove_unreferenced, merge_duplicates, fix_normals
    )
    return MeshRepairResult(**result)


@router.post("/geometry/measure-distance", response_model=MeasurementResult)
async def measure_distance(
    file: UploadFile = File(...),
    p1_x: float = Form(...),
    p1_y: float = Form(...),
    p1_z: float = Form(...),
    p2_x: float = Form(...),
    p2_y: float = Form(...),
    p2_z: float = Form(...),
    cad_service: CADService = Depends(get_cad_service),
) -> MeasurementResult:
    """Measure distance between two points."""
    logger.info("Measuring distance")
    mesh = await run_in_threadpool(cad_service.load_mesh_from_upload, file)
    result = await run_in_threadpool(
        cad_service.measure_distance,
        mesh,
        [p1_x, p1_y, p1_z],
        [p2_x, p2_y, p2_z],
    )
    return MeasurementResult(**result)


@router.post("/geometry/measure-angle", response_model=MeasurementResult)
async def measure_angle(
    v1_x: float = Form(...),
    v1_y: float = Form(...),
    v1_z: float = Form(...),
    v2_x: float = Form(...),
    v2_y: float = Form(...),
    v2_z: float = Form(...),
) -> MeasurementResult:
    """Measure angle between two vectors."""
    logger.info("Measuring angle")
    from app.services.cad_service import CADService
    cad_service = CADService()
    result = await run_in_threadpool(
        cad_service.measure_angle,
        [v1_x, v1_y, v1_z],
        [v2_x, v2_y, v2_z],
    )
    return MeasurementResult(**result)


@router.post("/geometry/detect-sharp-edges", response_model=SharpEdgeDetectionResult)
async def detect_sharp_edges(
    file: UploadFile = File(...),
    angle_threshold: float = Form(20.0),
    cad_service: CADService = Depends(get_cad_service),
) -> SharpEdgeDetectionResult:
    """Detect sharp edges in the mesh."""
    logger.info("Detecting sharp edges")
    mesh = await run_in_threadpool(cad_service.load_mesh_from_upload, file)
    result = await run_in_threadpool(cad_service.detect_sharp_edges, mesh, angle_threshold)
    return SharpEdgeDetectionResult(**result)


@router.post("/geometry/surface-features", response_model=SurfaceFeatures)
async def surface_features(
    file: UploadFile = File(...),
    cad_service: CADService = Depends(get_cad_service),
) -> SurfaceFeatures:
    """Calculate advanced surface features."""
    logger.info("Calculating surface features")
    mesh = await run_in_threadpool(cad_service.load_mesh_from_upload, file)
    result = await run_in_threadpool(cad_service.calculate_surface_features, mesh)
    return SurfaceFeatures(**result)


# 2D CAD Support Endpoints
@router.post("/2d/load", response_model=CAD2DFileResponse)
async def load_2d_file(
    file: UploadFile = File(...),
    cad_2d_service: CAD2DService = Depends(get_cad_2d_service),
) -> CAD2DFileResponse:
    """Load and parse a 2D CAD file (DXF or SVG)."""
    logger.info("Loading 2D CAD file=%s", file.filename)
    result = await run_in_threadpool(cad_2d_service.load_file, file)
    bbox_data = result.get("bounding_box", {})
    return CAD2DFileResponse(
        format=result["format"],
        layer_count=result.get("layer_count"),
        path_count=result.get("path_count"),
        entity_count=result.get("entity_count"),
        layers=result.get("layers"),
        paths=result.get("paths"),
        bounding_box=bbox_data,
        metadata=result.get("metadata", {}),
    )


@router.post("/2d/analyze", response_model=Geometry2DAnalysis)
async def analyze_2d_geometry(
    file: UploadFile = File(...),
    cad_2d_service: CAD2DService = Depends(get_cad_2d_service),
) -> Geometry2DAnalysis:
    """Analyze 2D geometry properties."""
    logger.info("Analyzing 2D geometry from file=%s", file.filename)
    geometry_data = await run_in_threadpool(cad_2d_service.load_file, file)
    result = await run_in_threadpool(cad_2d_service.analyze_2d_geometry, geometry_data)
    return Geometry2DAnalysis(**result)


@router.post("/2d/validate", response_model=Geometry2DValidation)
async def validate_2d_geometry(
    file: UploadFile = File(...),
    cad_2d_service: CAD2DService = Depends(get_cad_2d_service),
) -> Geometry2DValidation:
    """Validate 2D geometry for common issues."""
    logger.info("Validating 2D geometry from file=%s", file.filename)
    geometry_data = await run_in_threadpool(cad_2d_service.load_file, file)
    result = await run_in_threadpool(cad_2d_service.validate_2d_geometry, geometry_data)
    return Geometry2DValidation(**result)


@router.post("/2d/measure-distance", response_model=Measurement2D)
async def measure_2d_distance(
    p1_x: float = Form(...),
    p1_y: float = Form(...),
    p2_x: float = Form(...),
    p2_y: float = Form(...),
) -> Measurement2D:
    """Measure distance between two 2D points."""
    logger.info("Measuring 2D distance")
    cad_2d_service = CAD2DService()
    result = await run_in_threadpool(
        cad_2d_service.measure_2d_distance,
        [p1_x, p1_y],
        [p2_x, p2_y],
    )
    return Measurement2D(**result)


@router.post("/2d/measure-angle", response_model=Measurement2D)
async def measure_2d_angle(
    v1_x: float = Form(...),
    v1_y: float = Form(...),
    v2_x: float = Form(...),
    v2_y: float = Form(...),
) -> Measurement2D:
    """Measure angle between two 2D vectors."""
    logger.info("Measuring 2D angle")
    cad_2d_service = CAD2DService()
    result = await run_in_threadpool(
        cad_2d_service.measure_2d_angle,
        [v1_x, v1_y],
        [v2_x, v2_y],
    )
    return Measurement2D(**result)


# AI Design Creator Endpoints
@router.post("/design/generate", response_model=AIDesignConcept)
async def generate_design(
    request: DesignGenerationInput,
    design_service: DesignGeneratorService = Depends(get_design_generator_service),
) -> AIDesignConcept:
    """Generate a design concept using AI."""
    logger.info("Generating design for prompt: %s", request.user_prompt[:50])
    result = await run_in_threadpool(
        design_service.generate_definition,
        request.user_prompt,
        request.design_type,
    )
    return AIDesignConcept(**result)


@router.post("/design/render-3d", response_model=Design3DRendering)
async def render_design_3d(
    request: DesignGenerationInput,
    design_service: DesignGeneratorService = Depends(get_design_generator_service),
    cad_generator: CADGeneratorService = Depends(get_cad_generator_service),
) -> Design3DRendering:
    """Generate 3D rendering primitives for a design."""
    logger.info("Rendering design in 3D")
    design = await run_in_threadpool(
        design_service.generate_definition,
        request.user_prompt,
        request.design_type,
    )
    generated = await run_in_threadpool(cad_generator.generate, design)

    if generated.get("type") != "3D":
        raise CADGuardError("Requested 3D rendering but generated definition is 2D", 400)

    return Design3DRendering(
        mesh_url=generated["stl_url"],
        bounding_box=generated["bounding_box"],
        feature_tree=generated.get("feature_tree", []),
        rendering_notes="STL mesh generated from parametric CAD definition",
        warnings=generated.get("warnings", []),
    )


@router.post("/design/render-2d", response_model=Design2DRendering)
async def render_design_2d(
    request: DesignGenerationInput,
    design_service: DesignGeneratorService = Depends(get_design_generator_service),
    cad_generator: CADGeneratorService = Depends(get_cad_generator_service),
) -> Design2DRendering:
    """Generate 2D rendering shapes for a design."""
    logger.info("Rendering design in 2D")
    design = await run_in_threadpool(
        design_service.generate_definition,
        request.user_prompt,
        request.design_type,
    )
    generated = await run_in_threadpool(cad_generator.generate, design)

    if generated.get("type") != "2D":
        result = await run_in_threadpool(design_service.convert_to_2d_shapes, design)
        return Design2DRendering(**result)

    shapes = []
    for shape in generated.get("shapes", []):
        if shape.get("type") == "rectangle":
            position = shape.get("position", [20, 20])
            shapes.append(
                {
                    "type": "rectangle",
                    "x": float(position[0]),
                    "y": float(position[1]),
                    "width": float(shape.get("width", 10)),
                    "height": float(shape.get("height", 10)),
                    "color": "none",
                    "stroke": "#38bdf8",
                    "stroke_width": 2,
                }
            )
        elif shape.get("type") == "circle":
            position = shape.get("position", [20, 20])
            shapes.append(
                {
                    "type": "circle",
                    "cx": float(position[0]),
                    "cy": float(position[1]),
                    "r": float(shape.get("radius", 5)),
                    "color": "none",
                    "stroke": "#f97316",
                    "stroke_width": 2,
                }
            )

    return Design2DRendering(
        shapes=shapes,
        total_shapes=len(shapes),
        canvas_size=generated.get("canvas", {"width": 400, "height": 300}),
        svg_url=generated.get("svg_url"),
        feature_tree=generated.get("feature_tree", []),
        rendering_notes="2D drawing generated from parametric CAD definition",
        warnings=generated.get("warnings", []),
    )


@router.post("/design/complete", response_model=CompleteDesignResponse)
async def complete_design_generation(
    request: DesignGenerationInput,
    design_service: DesignGeneratorService = Depends(get_design_generator_service),
    cad_generator: CADGeneratorService = Depends(get_cad_generator_service),
    cad_service: CADService = Depends(get_cad_service),
    validation_service: ValidationService = Depends(get_validation_service),
) -> CompleteDesignResponse:
    """Generate complete design with all renderings and export options."""
    logger.info("Generating complete design")

    # Generate design concept
    design = await run_in_threadpool(
        design_service.generate_definition,
        request.user_prompt,
        request.design_type,
    )

    generated = await run_in_threadpool(cad_generator.generate, design)

    # Generate 3D and 2D renderings
    rendering_3d = None
    rendering_2d = None
    validation_summary = None
    validation_issues = []

    if generated.get("type") == "3D":
        rendering_3d = Design3DRendering(
            mesh_url=generated["stl_url"],
            bounding_box=generated["bounding_box"],
            feature_tree=generated.get("feature_tree", []),
            rendering_notes="STL mesh generated from parametric CAD definition",
            warnings=generated.get("warnings", []),
        )

        rendering_2d_dict = await run_in_threadpool(
            design_service.convert_to_2d_shapes,
            design,
        )
        rendering_2d = Design2DRendering(**rendering_2d_dict)

        mesh = generated.get("mesh")
        if mesh is not None:
            geometry = await run_in_threadpool(cad_service.extract_geometry_stats, mesh)
            validation_issues, validation_summary = await run_in_threadpool(validation_service.run_checks, geometry)
    else:
        shapes = []
        for shape in generated.get("shapes", []):
            if shape.get("type") == "rectangle":
                position = shape.get("position", [20, 20])
                shapes.append(
                    {
                        "type": "rectangle",
                        "x": float(position[0]),
                        "y": float(position[1]),
                        "width": float(shape.get("width", 10)),
                        "height": float(shape.get("height", 10)),
                        "color": "none",
                        "stroke": "#38bdf8",
                        "stroke_width": 2,
                    }
                )
            elif shape.get("type") == "circle":
                position = shape.get("position", [20, 20])
                shapes.append(
                    {
                        "type": "circle",
                        "cx": float(position[0]),
                        "cy": float(position[1]),
                        "r": float(shape.get("radius", 5)),
                        "color": "none",
                        "stroke": "#f97316",
                        "stroke_width": 2,
                    }
                )

        rendering_2d = Design2DRendering(
            shapes=shapes,
            total_shapes=len(shapes),
            canvas_size=generated.get("canvas", {"width": 400, "height": 300}),
            svg_url=generated.get("svg_url"),
            feature_tree=generated.get("feature_tree", []),
            rendering_notes="2D drawing generated from parametric CAD definition",
            warnings=generated.get("warnings", []),
        )

    # Get export options
    export_options_dict = await run_in_threadpool(
        design_service.generate_export_formats,
        design,
    )

    return CompleteDesignResponse(
        design_concept=AIDesignConcept(**design),
        rendering_3d=rendering_3d,
        rendering_2d=rendering_2d,
        export_options=export_options_dict,
        validation_summary=validation_summary,
        validation_issues=validation_issues,
    )
