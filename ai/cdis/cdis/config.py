from __future__ import annotations

import os
from functools import lru_cache
from typing import Optional

from pydantic import BaseModel, Field


class Settings(BaseModel):
    feature_enabled: bool = Field(default=False, validation_alias="CDIS_FEATURE_ENABLED")
    service_name: str = "Causal Discovery & Intervention Service"
    top_k_paths: int = 5
    default_algorithm: str = "notears"
    port: int = 8090


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.model_validate(
        {
            "CDIS_FEATURE_ENABLED": os.getenv("CDIS_FEATURE_ENABLED", "false").lower()
            in {"1", "true", "yes"},
            "port": int(os.getenv("CDIS_PORT", "8090")),
            "default_algorithm": os.getenv("CDIS_DEFAULT_ALGORITHM", "notears"),
            "top_k_paths": int(os.getenv("CDIS_TOP_K_PATHS", "5")),
        }
    )


FeatureFlag = Optional[bool]
