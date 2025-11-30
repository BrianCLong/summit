"""Autonomous investigator service package."""

from typing import TYPE_CHECKING, Any

from .case_report import (
    CaseManifest,
    CaseStep,
    build_cypher_preview,
    build_graphrag_summary,
    build_hypotheses,
    build_results_table,
    load_case_manifest,
)

if TYPE_CHECKING:  # pragma: no cover - import guard for static analyzers only
    from .main import app as fastapi_app


def __getattr__(name: str) -> Any:
    if name == "app":
        from .main import app as fastapi_app

        return fastapi_app
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    "app",
    "CaseManifest",
    "CaseStep",
    "build_cypher_preview",
    "build_graphrag_summary",
    "build_hypotheses",
    "build_results_table",
    "load_case_manifest",
]
