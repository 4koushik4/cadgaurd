from __future__ import annotations

from app.core.config import Settings
from app.schemas.models import GeometryStats, ValidationIssue, ValidationSummary


class ValidationService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def run_checks(self, geometry: GeometryStats) -> tuple[list[ValidationIssue], ValidationSummary]:
        issues: list[ValidationIssue] = []

        min_wall = self.settings.min_wall_thickness_mm
        if geometry.estimated_wall_thickness_mm < min_wall:
            issues.append(
                ValidationIssue(
                    rule_id="MIN_WALL_THICKNESS",
                    status="fail",
                    severity="high",
                    explanation="Estimated wall thickness is below minimum threshold and may cause structural failure.",
                    measured_value=geometry.estimated_wall_thickness_mm,
                    expected_value=min_wall,
                    unit="mm",
                )
            )

        if geometry.non_manifold_edges > 0:
            issues.append(
                ValidationIssue(
                    rule_id="NON_MANIFOLD_GEOMETRY",
                    status="fail",
                    severity="high",
                    explanation="Mesh contains non-manifold edges that can break slicing, simulation, or fabrication workflows.",
                    measured_value=float(geometry.non_manifold_edges),
                    expected_value=0.0,
                    unit="count",
                )
            )

        if geometry.inconsistent_normals:
            issues.append(
                ValidationIssue(
                    rule_id="NORMAL_CONSISTENCY",
                    status="fail",
                    severity="medium",
                    explanation="Inconsistent face winding/normals detected. This can lead to incorrect inside/outside interpretation.",
                )
            )

        if not geometry.is_watertight:
            issues.append(
                ValidationIssue(
                    rule_id="WATERTIGHTNESS",
                    status="fail",
                    severity="high",
                    explanation="Mesh is not watertight. Open boundaries can cause simulation instability and manufacturing failure.",
                )
            )

        aspect_ratio = max(geometry.extents) / max(min(geometry.extents), 1e-6)
        if aspect_ratio > 15:
            issues.append(
                ValidationIssue(
                    rule_id="STRUCTURAL_ASPECT_RATIO",
                    status="fail",
                    severity="medium",
                    explanation="High geometric aspect ratio indicates potential bending and buckling risk under load.",
                    measured_value=float(aspect_ratio),
                    expected_value=15.0,
                    unit="ratio",
                )
            )
        elif aspect_ratio > 10:
            issues.append(
                ValidationIssue(
                    rule_id="STRUCTURAL_ASPECT_RATIO_WARNING",
                    status="fail",
                    severity="low",
                    explanation="Aspect ratio is elevated and may reduce stiffness margins in dynamic loading.",
                    measured_value=float(aspect_ratio),
                    expected_value=10.0,
                    unit="ratio",
                )
            )

        high = sum(1 for i in issues if i.severity == "high")
        medium = sum(1 for i in issues if i.severity == "medium")
        low = sum(1 for i in issues if i.severity == "low")

        quality_score = max(0, 100 - (high * 30 + medium * 15 + low * 5))

        summary = ValidationSummary(
            pass_status=len(issues) == 0,
            total_issues=len(issues),
            high_issues=high,
            medium_issues=medium,
            low_issues=low,
            quality_score=int(quality_score),
        )

        return issues, summary
