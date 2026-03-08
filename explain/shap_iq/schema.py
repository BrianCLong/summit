"""Schema contracts for deterministic SHAP-IQ style artifacts."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

EVIDENCE_PREFIX = "EV-SHAPIQ-"


@dataclass(frozen=True)
class ExplainabilityReport:
    evidence_id: str
    model_id: str
    feature_names: list[str]
    feature_importance: list[dict[str, Any]]
    interaction_matrix: list[list[float]]
    decision_breakdown: list[dict[str, Any]]


REQUIRED_REPORT_KEYS = {
    "evidence_id",
    "model_id",
    "feature_names",
    "feature_importance",
    "interaction_matrix",
    "decision_breakdown",
}


REQUIRED_METRIC_KEYS = {
    "mean_abs_shap",
    "interaction_strength_mean",
    "latency_ms",
    "memory_mb",
    "interaction_compute_time",
}


def validate_report_shape(report: dict[str, Any]) -> None:
    missing = REQUIRED_REPORT_KEYS - set(report.keys())
    if missing:
        raise ValueError(f"report missing required keys: {sorted(missing)}")
    if not str(report["evidence_id"]).startswith(EVIDENCE_PREFIX):
        raise ValueError("evidence_id must start with EV-SHAPIQ-")
    matrix = report["interaction_matrix"]
    features = report["feature_names"]
    if len(matrix) != len(features):
        raise ValueError("interaction_matrix row count must equal number of features")
    for row in matrix:
        if len(row) != len(features):
            raise ValueError("interaction_matrix must be square")


def validate_metrics_shape(metrics: dict[str, Any]) -> None:
    missing = REQUIRED_METRIC_KEYS - set(metrics.keys())
    if missing:
        raise ValueError(f"metrics missing required keys: {sorted(missing)}")
