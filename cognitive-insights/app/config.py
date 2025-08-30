from __future__ import annotations

from functools import lru_cache

from pydantic import BaseModel, Field


class Settings(BaseModel):
    """Application configuration loaded from environment variables."""

    backend: str = Field(default="hf", alias="BACKEND")
    batch_size: int = Field(default=8, alias="BATCH_SIZE")
    store_raw: bool = Field(default=False, alias="STORE_RAW")
    raw_retention_hours: int = Field(default=24, alias="RAW_RETENTION_HOURS")
    k_anon: int = Field(default=20, alias="K_ANON")
    enable_dp: bool = Field(default=False, alias="ENABLE_DP")
    dp_epsilon: float = Field(default=1.0, alias="DP_EPSILON")

    database_url: str = Field(default="sqlite:///./local.db", alias="DATABASE_URL")
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    rate_limit_per_minute: int = Field(default=60, alias="RATE_LIMIT_PER_MINUTE")


@lru_cache
def get_settings() -> Settings:
    """Return a cached instance of :class:`Settings`."""

    return Settings()  # type: ignore[arg-type]


__all__ = ["Settings", "get_settings"]
