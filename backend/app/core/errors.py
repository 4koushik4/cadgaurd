from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError


class CADGuardError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def cadguard_exception_handler(_: Request, exc: CADGuardError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "type": "cadguard_error",
                "message": exc.message,
            }
        },
    )


def validation_exception_handler(_: Request, exc: ValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "type": "validation_error",
                "message": "Request validation failed",
                "details": exc.errors(),
            }
        },
    )


def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "type": "internal_error",
                "message": "Unexpected server error",
                "details": str(exc),
            }
        },
    )
