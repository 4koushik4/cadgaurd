from __future__ import annotations

import json
import logging

from groq import Groq

from app.core.config import Settings
from app.schemas.models import AICopilotRequest, AICopilotResponse

logger = logging.getLogger(__name__)


class AICopilotService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None

    def analyze(self, payload: AICopilotRequest) -> AICopilotResponse:
        if not self.client:
            return self._fallback(payload)

        prompt = (
            "You are a mechanical design expert.\n\n"
            "Analyze the following CAD validation and simulation data.\n\n"
            "Provide:\n"
            "1. Key design issues\n"
            "2. Suggested fixes\n"
            "3. Optimization recommendations\n"
            "4. Risk warnings\n\n"
            "Data:\n"
            f"{json.dumps(payload.validation_results)}\n"
            f"{json.dumps(payload.simulation_results)}\n\n"
            "Respond clearly and concisely as strict JSON with fields:\n"
            "{\"summary\": string, \"issues\": string[], \"suggestions\": string[], \"risks\": string[]}."
        )

        try:
            completion = self.client.chat.completions.create(
                model="llama3-70b-8192",
                temperature=0.2,
                max_tokens=900,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": "You provide practical, accurate CAD and simulation guidance for engineering teams.",
                    },
                    {"role": "user", "content": prompt},
                ],
            )
            content = completion.choices[0].message.content or "{}"
            parsed = json.loads(content)
            return AICopilotResponse(
                summary=str(parsed.get("summary", "")).strip() or self._fallback(payload).summary,
                issues=[str(item).strip() for item in parsed.get("issues", []) if str(item).strip()],
                suggestions=[str(item).strip() for item in parsed.get("suggestions", []) if str(item).strip()],
                risks=[str(item).strip() for item in parsed.get("risks", []) if str(item).strip()],
            )
        except Exception as exc:
            logger.warning("AI copilot inference failed, using fallback: %s", exc)
            return self._fallback(payload)

    def _fallback(self, payload: AICopilotRequest) -> AICopilotResponse:
        summary = "Design analysis completed. Review high-severity issues and weak stress regions to improve structural reliability."

        high_issues = payload.validation_results.get("summary", {}).get("high_issues", 0)
        risk_level = payload.simulation_results.get("simulation", {}).get("risk_level", "unknown")
        weak_regions = payload.simulation_results.get("simulation", {}).get("weak_regions", [])

        issues = [
            f"Detected {high_issues} high-severity validation issue(s).",
            f"Simulation risk level is {risk_level}.",
        ]
        suggestions = [
            "Increase wall thickness or add ribs around weak regions.",
            "Improve mesh quality and watertightness before manufacturing.",
            "Re-run simulation with alternate materials to reduce peak stress.",
        ]
        risks = [
            f"{len(weak_regions)} weak region(s) identified under current load assumptions.",
            "Potential fatigue or local yielding if stress concentrations are not reduced.",
        ]

        return AICopilotResponse(summary=summary, issues=issues, suggestions=suggestions, risks=risks)
