"""Deterministic SHAP-IQ style explanation engine.

This module intentionally implements a bounded, governance-friendly approximation layer
that computes feature attributions and pairwise interactions with deterministic ordering.
"""

from __future__ import annotations

import hashlib
import json
import random
import time
from dataclasses import dataclass

from .interactions import interaction_strength_mean, pairwise_interaction_matrix


@dataclass(frozen=True)
class ExplainConfig:
    seed: int = 7
    max_features: int = 100


@dataclass(frozen=True)
class ExplainResult:
    evidence_id: str
    feature_importance: list[dict[str, float | str]]
    interaction_matrix: list[list[float]]
    decision_breakdown: list[dict[str, float | str | int]]
    metrics: dict[str, float]


def _stable_hash(payload: dict) -> str:
    rendered = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(rendered.encode("utf-8")).hexdigest()


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def explain(
    model_id: str,
    feature_names: list[str],
    rows: list[list[float]],
    coefficients: list[float],
    baseline: list[float] | None = None,
    config: ExplainConfig | None = None,
) -> ExplainResult:
    started = time.perf_counter()
    config = config or ExplainConfig()

    if len(feature_names) > config.max_features:
        raise ValueError(f"max supported features is {config.max_features}")
    if len(feature_names) != len(coefficients):
        raise ValueError("feature_names and coefficients length mismatch")

    rng = random.Random(config.seed)
    baseline = baseline or [_mean([row[i] for row in rows]) for i in range(len(feature_names))]

    contributions: list[list[float]] = []
    decision_breakdown = []
    for index, row in enumerate(rows):
        if len(row) != len(feature_names):
            raise ValueError("all rows must match feature_names length")

        row_contrib = [(row[i] - baseline[i]) * coefficients[i] for i in range(len(feature_names))]
        contributions.append(row_contrib)
        score = sum(row_contrib)
        decision_breakdown.append(
            {
                "row_index": index,
                "score": round(score, 12),
                "bias": round(rng.uniform(0.0, 0.0), 12),
            }
        )

    abs_means = []
    for i, name in enumerate(feature_names):
        col_vals = [abs(row[i]) for row in contributions]
        abs_means.append((name, _mean(col_vals)))

    abs_means.sort(key=lambda item: (-item[1], item[0]))
    feature_importance = [
        {"feature": name, "mean_abs_shap": round(value, 12)} for name, value in abs_means
    ]

    matrix = pairwise_interaction_matrix(contributions)
    duration_ms = (time.perf_counter() - started) * 1000.0

    id_hash = _stable_hash(
        {
            "model_id": model_id,
            "feature_names": feature_names,
            "feature_importance": feature_importance,
            "interaction_matrix": matrix,
            "decision_breakdown": decision_breakdown,
        }
    )[:12]

    metrics = {
        "mean_abs_shap": round(_mean([item["mean_abs_shap"] for item in feature_importance]), 12),
        "interaction_strength_mean": round(interaction_strength_mean(matrix), 12),
        "latency_ms": round(duration_ms, 3),
        "memory_mb": 0.0,
        "interaction_compute_time": round(duration_ms, 3),
    }

    return ExplainResult(
        evidence_id=f"EV-SHAPIQ-{model_id}-{id_hash}",
        feature_importance=feature_importance,
        interaction_matrix=matrix,
        decision_breakdown=decision_breakdown,
        metrics=metrics,
    )
