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
