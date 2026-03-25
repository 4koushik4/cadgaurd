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
)
from app.services.ai_copilot import AICopilotService
from app.services.ai_service import AIService
from app.services.cad_service import CADService
from app.services.chatbot import ChatbotService
from app.services.simulation_service import SimulationService
from app.services.validation_service import ValidationService

logger = logging.getLogger(__name__)
router = APIRouter()


def get_cad_service() -> CADService:
    return CADService()


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
