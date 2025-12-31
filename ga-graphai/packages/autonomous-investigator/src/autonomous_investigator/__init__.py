"""Autonomous investigator service package."""

from importlib import import_module
from typing import Any

from .case_report import (
    build_cypher_preview,
    build_graphrag_summary,
    build_hypotheses,
    build_results_table,
    load_case_manifest,
)
from .fusion_pipeline import (
    CorrelationResult,
    FusionEntity,
    FusionOutcome,
    FusionPattern,
    IntelligenceFusionPipeline,
)
from .narrative_watcher import (
    MemoryEntry,
    MemoryStore,
    NarrativeWatcher,
    PerformanceSnapshot,
    ReflectionReport,
)

__all__ = [
    "app",
    "CorrelationResult",
    "FusionEntity",
    "FusionOutcome",
    "FusionPattern",
    "IntelligenceFusionPipeline",
    "build_cypher_preview",
    "build_graphrag_summary",
    "build_hypotheses",
    "build_results_table",
    "load_case_manifest",
    "MemoryEntry",
    "MemoryStore",
    "NarrativeWatcher",
    "PerformanceSnapshot",
    "ReflectionReport",
]


def __getattr__(name: str) -> Any:  # pragma: no cover
    if name == "app":
        return import_module("autonomous_investigator.main").app
    raise AttributeError(name)
