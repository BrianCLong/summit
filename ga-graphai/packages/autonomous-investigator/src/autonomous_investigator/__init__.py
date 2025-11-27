"""Autonomous investigator service package."""

from importlib import import_module
from typing import Any

from .fusion_pipeline import (
    CorrelationResult,
    FusionEntity,
    FusionOutcome,
    FusionPattern,
    IntelligenceFusionPipeline,
)

__all__ = [
    "app",
    "CorrelationResult",
    "FusionEntity",
    "FusionOutcome",
    "FusionPattern",
    "IntelligenceFusionPipeline",
]


def __getattr__(name: str) -> Any:  # pragma: no cover
    if name == "app":
        return import_module("autonomous_investigator.main").app
    raise AttributeError(name)
