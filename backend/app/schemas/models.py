from pydantic import BaseModel, Field


class GeometryStats(BaseModel):
    vertices: int
    faces: int
    bounding_box_min: list[float]
    bounding_box_max: list[float]
    extents: list[float]
    volume: float
    surface_area: float
    is_watertight: bool
    estimated_wall_thickness_mm: float
    non_manifold_edges: int
    inconsistent_normals: bool


class ValidationIssue(BaseModel):
    rule_id: str
    status: str
    severity: str
    explanation: str
    measured_value: float | None = None
    expected_value: float | None = None
    unit: str | None = None


class ValidationSummary(BaseModel):
    pass_status: bool
    total_issues: int
    high_issues: int
    medium_issues: int
    low_issues: int
    quality_score: int = Field(ge=0, le=100)


class StressWeakRegion(BaseModel):
    face_index: int
    risk_score: float


class StressPoint(BaseModel):
    x: float
    y: float
    z: float
    stress: float = Field(ge=0.0, le=1.0)


class SimulationResult(BaseModel):
    material: str
    max_stress: float
    avg_stress: float
    risk_level: str
    weak_regions: list[StressWeakRegion]
    stress_map: list[StressPoint]
    digital_twin_summary: str


class AIInsight(BaseModel):
    explanation: str
    suggestions: list[str]


class ValidateResponse(BaseModel):
    geometry: GeometryStats
    validation_issues: list[ValidationIssue]
    summary: ValidationSummary
    ai_insight: AIInsight


class SimulateResponse(BaseModel):
    geometry: GeometryStats
    simulation: SimulationResult
    ai_insight: AIInsight


class AICopilotRequest(BaseModel):
    validation_results: dict
    simulation_results: dict
    geometry_stats: dict


class AICopilotResponse(BaseModel):
    summary: str
    issues: list[str]
    suggestions: list[str]
    risks: list[str]


class ChatbotRequest(BaseModel):
    user_input: str
    validation_results: dict = Field(default_factory=dict)
    simulation_results: dict = Field(default_factory=dict)


class ChatbotResponse(BaseModel):
    reply: str
    quick_actions: list[str] = Field(default_factory=list)


class AutoFixRequest(BaseModel):
    validation_issues: list[dict]


class AutoFixSuggestion(BaseModel):
    issue: str
    probable_cause: str
    recommended_fix: str
    target_value: str | None = None


class AutoFixResponse(BaseModel):
    summary: str
    fixes: list[AutoFixSuggestion]


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


# Advanced Geometry Analysis Models
class SectionViewResponse(BaseModel):
    success: bool
    section_count: int | None = None
    message: str | None = None
    properties: dict | None = None


class HoleDetectionResult(BaseModel):
    has_cavities: bool
    cavity_volume: float
    cavity_percentage: float
    convex_volume: float
    mesh_volume: float
    message: str | None = None


class MeshRepairResult(BaseModel):
    success: bool
    issues_fixed: list[str]
    vertices_removed: int
    faces_removed: int
    is_watertight_before: bool
    is_watertight_after: bool


class MeasurementResult(BaseModel):
    distance: float | None = None
    point1: list[float] | None = None
    point2: list[float] | None = None
    angle_degrees: float | None = None
    angle_radians: float | None = None
    vector1: list[float] | None = None
    vector2: list[float] | None = None
    units: str | None = None


class SharpEdge(BaseModel):
    edge: list[int]
    angle_degrees: float
    vertex_count: int


class SharpEdgeDetectionResult(BaseModel):
    sharp_edges_count: int
    threshold_degrees: float
    sharp_edges: list[SharpEdge]


class SurfaceFeatures(BaseModel):
    average_edge_length: float
    total_edges: int
    euler_characteristic: int
    genus: int
    is_manifold: bool
    triangles: int


# 2D CAD Models
class BoundingBox2D(BaseModel):
    min_x: float
    min_y: float
    max_x: float
    max_y: float
    width: float
    height: float


class CAD2DFileResponse(BaseModel):
    format: str
    layer_count: int | None = None
    path_count: int | None = None
    entity_count: int | None = None
    layers: dict | None = None
    paths: list | None = None
    bounding_box: BoundingBox2D
    metadata: dict


class Geometry2DAnalysis(BaseModel):
    total_entities: int
    lines: int
    circles: int
    polygons: int
    total_perimeter: float
    total_area: float
    bounding_box: BoundingBox2D
    complexity_score: int


class ValidationIssue2D(BaseModel):
    type: str
    severity: str
    description: str
    entity_type: str | None = None
    entity_count: int | None = None


class Geometry2DValidation(BaseModel):
    is_valid: bool
    total_issues: int
    errors: int
    warnings: int
    info: int
    issues: list[ValidationIssue2D]


class Measurement2D(BaseModel):
    distance: float | None = None
    point1: list[float] | None = None
    point2: list[float] | None = None
    delta_x: float | None = None
    delta_y: float | None = None
    angle_degrees: float | None = None
    angle_radians: float | None = None
    vector1: list[float] | None = None
    vector2: list[float] | None = None
    units: str | None = None


# AI Design Creator Models
class DesignGenerationInput(BaseModel):
    user_prompt: str
    design_type: str = "auto"  # auto, 2d, 3d


class RenderingHints(BaseModel):
    primary_shapes: list[str]
    colors: list[str]
    complexity_level: str


class AIDesignConcept(BaseModel):
    type: str  # "2d" or "3d"
    description: str
    dimensions: str
    structure: str
    recommendations: str
    rendering_hints: RenderingHints


class Primitive3D(BaseModel):
    type: str
    position: list[float]
    scale: list[float] | None = None
    radius: float | None = None
    height: float | None = None
    color: str
    rotation: list[float] | None = None
    major_radius: float | None = None
    minor_radius: float | None = None


class BoundingBox3D(BaseModel):
    min_x: float
    min_y: float
    min_z: float
    max_x: float
    max_y: float
    max_z: float


class Design3DRendering(BaseModel):
    primitives: list[Primitive3D]
    total_primitives: int
    bounding_box: BoundingBox3D
    rendering_notes: str


class Shape2D(BaseModel):
    type: str
    x: float | None = None
    y: float | None = None
    width: float | None = None
    height: float | None = None
    cx: float | None = None
    cy: float | None = None
    r: float | None = None
    points: str | None = None
    d: str | None = None
    color: str
    stroke: str | None = None
    stroke_width: int | None = None


class CanvasSize(BaseModel):
    width: int
    height: int


class Design2DRendering(BaseModel):
    shapes: list[Shape2D]
    total_shapes: int
    canvas_size: CanvasSize
    rendering_notes: str


class ExportFormat(BaseModel):
    format: str
    description: str
    recommended: bool
    file_extension: str


class DesignExportOptions(BaseModel):
    recommended_formats: list[ExportFormat]
    design_type: str
    notes: str


class CompleteDesignResponse(BaseModel):
    design_concept: AIDesignConcept
    rendering_3d: Design3DRendering | None = None
    rendering_2d: Design2DRendering | None = None
    export_options: DesignExportOptions
