from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CADGuard AI Backend"
    app_version: str = "1.0.0"
    environment: str = "development"
    api_prefix: str = ""

    groq_api_key: str = ""
    groq_model: str = "llama3-70b-8192"

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ]

    min_wall_thickness_mm: float = 2.0
    max_quality_penalty: int = 100

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
