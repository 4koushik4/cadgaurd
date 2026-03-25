from __future__ import annotations

import json
import logging

from groq import Groq

from app.core.config import Settings
from app.schemas.models import (
    AutoFixRequest,
    AutoFixResponse,
    AutoFixSuggestion,
    ChatbotRequest,
    ChatbotResponse,
)

logger = logging.getLogger(__name__)


class ChatbotService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None

    def chat(self, request: ChatbotRequest) -> ChatbotResponse:
        if not self.client:
            return self._fallback_chat(request)

        prompt = (
            "You are an AI mechanical design assistant.\n\n"
            "Help users:\n"
            "- Fix CAD issues\n"
            "- Explain validation errors\n"
            "- Suggest improvements\n\n"
            f"User query:\n{request.user_input}\n\n"
            f"Context:\n{json.dumps(request.validation_results)}\n{json.dumps(request.simulation_results)}\n\n"
            "Respond as strict JSON: {\"reply\": string, \"quick_actions\": string[]}."
        )

        fallback = self._fallback_chat(request)
        try:
            completion = self.client.chat.completions.create(
                model=self.settings.groq_model,
                temperature=0.2,
                max_tokens=800,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": "You provide concise and actionable CAD guidance to engineering teams.",
                    },
                    {"role": "user", "content": prompt},
                ],
            )
            parsed = json.loads(completion.choices[0].message.content or "{}")
            reply = str(parsed.get("reply", "")).strip()
            quick_actions = parsed.get("quick_actions", [])
            if not isinstance(quick_actions, list):
                quick_actions = [str(quick_actions)]

            if not reply:
                return fallback

            clean_actions = [str(item).strip() for item in quick_actions if str(item).strip()]
            return ChatbotResponse(reply=reply, quick_actions=clean_actions or fallback.quick_actions)
        except Exception as exc:
            logger.warning("Chatbot inference failed, using fallback: %s", exc)
            return fallback

    def suggest_fixes(self, request: AutoFixRequest) -> AutoFixResponse:
        if not self.client:
            return self._fallback_autofix(request)

        prompt = (
            "You are an AI engineering error-fixing bot for CAD validation issues.\n"
            "Given validation issues, provide concrete fixes with target values when possible.\n"
            "Respond as strict JSON with:\n"
            "{\"summary\": string, \"fixes\": [{\"issue\": string, \"probable_cause\": string, \"recommended_fix\": string, \"target_value\": string|null}]}\n\n"
            f"Validation issues:\n{json.dumps(request.validation_issues)}"
        )

        fallback = self._fallback_autofix(request)
        try:
            completion = self.client.chat.completions.create(
                model=self.settings.groq_model,
                temperature=0.1,
                max_tokens=900,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": "You output practical, safe, and specific engineering fixes.",
                    },
                    {"role": "user", "content": prompt},
                ],
            )
            parsed = json.loads(completion.choices[0].message.content or "{}")

            summary = str(parsed.get("summary", "")).strip() or fallback.summary
            fixes_data = parsed.get("fixes", [])
            if not isinstance(fixes_data, list):
                return fallback

            fixes: list[AutoFixSuggestion] = []
            for entry in fixes_data:
                if not isinstance(entry, dict):
                    continue
                issue = str(entry.get("issue", "")).strip()
                probable_cause = str(entry.get("probable_cause", "")).strip()
                recommended_fix = str(entry.get("recommended_fix", "")).strip()
                target_value = entry.get("target_value")
                if not issue or not probable_cause or not recommended_fix:
                    continue
                fixes.append(
                    AutoFixSuggestion(
                        issue=issue,
                        probable_cause=probable_cause,
                        recommended_fix=recommended_fix,
                        target_value=str(target_value).strip() if target_value is not None else None,
                    )
                )

            if not fixes:
                return fallback

            return AutoFixResponse(summary=summary, fixes=fixes)
        except Exception as exc:
            logger.warning("Auto-fix inference failed, using fallback: %s", exc)
            return fallback

    def _fallback_chat(self, request: ChatbotRequest) -> ChatbotResponse:
        msg = request.user_input.lower()
        if "fix" in msg:
            reply = (
                "Start by resolving high-severity issues first: increase thin walls above minimum threshold, "
                "repair non-manifold edges, and rerun validation before simulation."
            )
        elif "explain" in msg or "issue" in msg:
            reply = (
                "The main blockers are usually geometric rule violations and stress concentration zones. "
                "Review issue severity, then map each issue to a geometry adjustment and verify with a new simulation run."
            )
        elif "optimiz" in msg:
            reply = (
                "Optimize by reducing stress concentrations with fillets/ribs, balancing wall thickness, and selecting "
                "a higher-yield material only where required to control weight."
            )
        else:
            reply = (
                "I can help with design fixes, issue explanations, and optimization strategies using your validation "
                "and simulation context."
            )

        return ChatbotResponse(
            reply=reply,
            quick_actions=["Fix this design", "Explain issue", "Optimize model"],
        )

    def _fallback_autofix(self, request: AutoFixRequest) -> AutoFixResponse:
        fixes: list[AutoFixSuggestion] = []

        for issue in request.validation_issues:
            text = f"{issue.get('rule_id', '')} {issue.get('explanation', '')}".lower()
            if "thin" in text or "thickness" in text:
                fixes.append(
                    AutoFixSuggestion(
                        issue=str(issue.get("explanation", "Wall thickness below threshold")),
                        probable_cause="Local section thickness is below manufacturing minimum.",
                        recommended_fix="Increase wall thickness in the flagged region and smooth transitions.",
                        target_value=">= 2.0 mm",
                    )
                )
            elif "non-manifold" in text:
                fixes.append(
                    AutoFixSuggestion(
                        issue=str(issue.get("explanation", "Non-manifold geometry")),
                        probable_cause="Mesh has invalid edge connectivity.",
                        recommended_fix="Run mesh repair and close open edges to ensure manifold solid.",
                        target_value="0 non-manifold edges",
                    )
                )
            else:
                fixes.append(
                    AutoFixSuggestion(
                        issue=str(issue.get("explanation", "Validation issue")),
                        probable_cause="Geometry or topology does not satisfy validation rule.",
                        recommended_fix="Adjust local geometry and rerun validation to confirm compliance.",
                    )
                )

        if not fixes:
            fixes = [
                AutoFixSuggestion(
                    issue="No issues provided",
                    probable_cause="Validation input was empty.",
                    recommended_fix="Run validation first and submit detected issues for tailored fixes.",
                )
            ]

        return AutoFixResponse(
            summary="Generated deterministic fix suggestions from provided validation issues.",
            fixes=fixes,
        )
