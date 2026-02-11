from __future__ import annotations

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[2]))

from eval.baselines import evaluate_thresholds


def test_evaluate_thresholds_accepts_passing_results() -> None:
    baselines = {
        "suites": {
            "core_evals": {
                "gates": {
                    "min_mean_score": 0.2,
                    "max_error_rate": 0.05,
                    "max_p95_latency_ms": 1000,
                    "max_mean_cost_per_item_usd": 0.01,
                }
            }
        }
    }
    results = [
        {
            "task": "copilot_summary",
            "model": "mock",
            "mean_score": 0.5,
            "error_rate": 0.0,
            "p95_latency_ms": 100,
            "mean_cost_per_item_usd": 0.001,
        }
    ]

    failures = evaluate_thresholds(results, baselines, "core_evals")

    assert failures == []


def test_evaluate_thresholds_flags_failures() -> None:
    baselines = {
        "suites": {
            "core_evals": {
                "gates": {
                    "min_mean_score": 0.8,
                    "max_error_rate": 0.01,
                    "max_p95_latency_ms": 50,
                    "max_mean_cost_per_item_usd": 0.0001,
                }
            }
        }
    }
    results = [
        {
            "task": "copilot_summary",
            "model": "mock",
            "mean_score": 0.5,
            "error_rate": 0.2,
            "p95_latency_ms": 100,
            "mean_cost_per_item_usd": 0.01,
        }
    ]

    failures = evaluate_thresholds(results, baselines, "core_evals")

    assert {failure["metric"] for failure in failures} == {
        "mean_score",
        "error_rate",
        "p95_latency_ms",
        "mean_cost_per_item_usd",
    }
