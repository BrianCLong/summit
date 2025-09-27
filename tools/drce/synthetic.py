"""Synthetic scenario generator for DRCE acceptance tests."""

from __future__ import annotations

from typing import Iterable

from .scenario import DriftScenario


def build_synthetic_scenario(planted_cause: str = "feature:payment_failure_rate") -> DriftScenario:
    """Construct a deterministic synthetic scenario with a planted root cause."""

    datasets = [
        {
            "name": "dataset:acquisition_stream",
            "baseline": 0.02,
            "current": 0.05,
            "samples": 4000,
            "weight": 0.9,
            "psi": 0.12,
        },
        {
            "name": "dataset:retention_panel",
            "baseline": 0.015,
            "current": 0.018,
            "samples": 3200,
            "weight": 0.6,
            "psi": 0.04,
        },
    ]

    features = [
        {
            "name": "feature:payment_failure_rate",
            "baseline": 0.04,
            "current": 0.095,
            "samples": 5000,
            "weight": 1.4,
            "psi": 0.32,
            "kolmogorov_smirnov": 0.41,
        },
        {
            "name": "feature:session_duration",
            "baseline": 45.2,
            "current": 43.8,
            "samples": 4800,
            "weight": 0.5,
            "psi": 0.05,
        },
        {
            "name": "feature:device_type_mobile_share",
            "baseline": 0.62,
            "current": 0.64,
            "samples": 4700,
            "weight": 0.4,
            "psi": 0.03,
        },
    ]

    pipelines = [
        {
            "name": "pipeline:model_version_v47",
            "baseline": 0.12,
            "current": 0.15,
            "samples": 1,
            "weight": 0.7,
            "change_rate": 0.03,
        },
        {
            "name": "pipeline:feature_store_sync",
            "baseline": 0.06,
            "current": 0.065,
            "samples": 1,
            "weight": 0.5,
            "change_rate": 0.005,
        },
    ]

    policies = [
        {
            "name": "policy:consent_scope_update",
            "baseline": 0.0,
            "current": 0.02,
            "samples": 1,
            "weight": 0.8,
            "opt_out_delta": 0.02,
        },
        {
            "name": "policy:regional_holdback",
            "baseline": 0.0,
            "current": 0.01,
            "samples": 1,
            "weight": 0.3,
            "opt_out_delta": 0.01,
        },
    ]

    _boost_planted_cause(datasets, features, pipelines, policies, planted_cause)

    return DriftScenario.from_raw(datasets, features, pipelines, policies)


def _boost_planted_cause(
    datasets: Iterable[dict],
    features: Iterable[dict],
    pipelines: Iterable[dict],
    policies: Iterable[dict],
    planted_cause: str,
) -> None:
    """Increase the weight of the planted cause to ensure top ranking."""

    all_groups = [datasets, features, pipelines, policies]
    for group in all_groups:
        for entry in group:
            if entry["name"] == planted_cause:
                entry["weight"] = max(entry.get("weight", 1.0) * 2.5, 1.5)
                return
