from __future__ import annotations

import json
import logging

from groq import Groq

from app.core.config import Settings
from app.schemas.models import AIInsight, SimulationResult, ValidationIssue, ValidationSummary

logger = logging.getLogger(__name__)


class AIService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None

    def explain_validation(
        self,
        issues: list[ValidationIssue],
        summary: ValidationSummary,
    ) -> AIInsight:
        if not self.client:
            return self._fallback_validation_insight(issues, summary)

        payload = {
            "summary": summary.model_dump(),
            "issues": [issue.model_dump() for issue in issues],
        }
        system = (
            "You are a senior CAD validation engineer. Explain detected issues in plain engineering language and "
            "provide concise improvement actions. Respond with strict JSON: {\"explanation\": string, \"suggestions\": string[]}."
        )

        return self._invoke(payload, system, fallback=self._fallback_validation_insight(issues, summary))

    def explain_simulation(self, simulation: SimulationResult) -> AIInsight:
        if not self.client:
            return self._fallback_simulation_insight(simulation)

        payload = {
            "simulation": simulation.model_dump(),
        }
        system = (
            "You are a structural simulation specialist. Explain stress results and provide actionable design improvements. "
            "Respond with strict JSON: {\"explanation\": string, \"suggestions\": string[]}."
        )

        return self._invoke(payload, system, fallback=self._fallback_simulation_insight(simulation))

    def _invoke(self, payload: dict, system_prompt: str, fallback: AIInsight) -> AIInsight:
        try:
            completion = self.client.chat.completions.create(
                model=self.settings.groq_model,
                temperature=0.2,
                max_tokens=700,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(payload)},
                ],
            )
            content = completion.choices[0].message.content or "{}"
            parsed = json.loads(content)
            explanation = str(parsed.get("explanation", "")).strip()
            suggestions = parsed.get("suggestions", [])
            if not isinstance(suggestions, list):
                suggestions = [str(suggestions)]

            if not explanation:
                return fallback

            clean_suggestions = [str(item).strip() for item in suggestions if str(item).strip()]
            return AIInsight(
                explanation=explanation,
                suggestions=clean_suggestions or fallback.suggestions,
            )
        except Exception as exc:
            logger.warning("Groq inference failed, falling back: %s", exc)
            return fallback

    def _fallback_validation_insight(self, issues: list[ValidationIssue], summary: ValidationSummary) -> AIInsight:
        if not issues:
            return AIInsight(
                explanation="No deterministic rule violations were detected. The design currently meets configured quality thresholds.",
                suggestions=[
                    "Run simulation for load-specific risk estimation.",
                    "Validate manufacturing tolerances with process-specific constraints.",
                ],
            )

        explanation = (
            f"Validation detected {summary.total_issues} issue(s), including {summary.high_issues} high-severity issue(s). "
            "Primary risks include inadequate wall thickness, mesh quality defects, or structural geometry imbalance."
        )
        suggestions = [
            "Increase local wall thickness in thin regions above configured threshold.",
            "Repair mesh topology to remove non-manifold edges and ensure watertightness.",
            "Reduce extreme aspect ratios or add stiffening features in high-risk spans.",
        ]
        return AIInsight(explanation=explanation, suggestions=suggestions)

    def _fallback_simulation_insight(self, simulation: SimulationResult) -> AIInsight:
        explanation = (
            f"Approximate simulation indicates {simulation.risk_level} risk with max stress {simulation.max_stress:.2f} MPa. "
            f"Detected {len(simulation.weak_regions)} weak regions under the current loading assumption."
        )
        suggestions = [
            "Increase section thickness or add ribs around weak regions.",
            "Distribute load paths using fillets and smoother transitions.",
            "Consider stronger material or lower peak load in critical directions.",
        ]
        return AIInsight(explanation=explanation, suggestions=suggestions)
