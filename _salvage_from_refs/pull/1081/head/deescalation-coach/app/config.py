"""Application configuration management."""

from __future__ import annotations

from functools import lru_cache
from pydantic import BaseModel
import os
import logging


class Settings(BaseModel):
    model_backend: str = os.getenv("MODEL_BACKEND", "transformers")
    model_name: str = os.getenv("MODEL_NAME", "mistral-7b-instruct")
    model_dir: str = os.getenv("MODEL_DIR", "/models")
    max_input_tokens: int = int(os.getenv("MAX_INPUT_TOKENS", "1024"))
    max_output_tokens: int = int(os.getenv("MAX_OUTPUT_TOKENS", "256"))
    rate_limit_rps: int = int(os.getenv("RATE_LIMIT_RPS", "5"))
    auth_mode: str = os.getenv("AUTH_MODE", "none")
    store_raw: bool = os.getenv("STORE_RAW", "false").lower() == "true"
    raw_retention_hours: int = int(os.getenv("RAW_RETENTION_HOURS", "0"))
    enable_prometheus: bool = os.getenv("ENABLE_PROMETHEUS", "true").lower() == "true"
    api_key: str | None = os.getenv("API_KEY")

    class Config:
        frozen = True


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    logging.getLogger(__name__).info(
        "effective_config",
        extra={k: ("***" if "key" in k.lower() else v) for k, v in settings.model_dump().items()},
    )
    return settings


config = get_settings()
