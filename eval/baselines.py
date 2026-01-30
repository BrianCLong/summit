from __future__ import annotations

import os
from typing import Any, Dict, List

DEFAULT_BASELINE_PATH = os.path.join(os.path.dirname(__file__), "baselines.yaml")


def load_baselines(path: str = DEFAULT_BASELINE_PATH) -> dict[str, Any]:
    if not os.path.exists(path):
        return {}
    import yaml

    with open(path) as handle:
        data = yaml.safe_load(handle)
    return data or {}


def resolve_suite_id(suite: dict[str, Any], suite_path: str) -> str:
    if suite and suite.get("id"):
        return str(suite["id"])
    filename = os.path.basename(suite_path)
    return os.path.splitext(filename)[0]


def evaluate_thresholds(
    results: list[dict[str, Any]], baselines: dict[str, Any], suite_id: str
) -> list[dict[str, Any]]:
    suites = baselines.get("suites", {})
    suite_cfg = suites.get(suite_id, {})
    if not suite_cfg:
        return []

    gates = suite_cfg.get("gates", {})
    tasks_cfg = suite_cfg.get("tasks", {})
    failures: list[dict[str, Any]] = []

    for result in results:
        task_name = result.get("task")
        task_cfg = tasks_cfg.get(task_name, {})

        min_mean_score = task_cfg.get("min_mean_score", gates.get("min_mean_score"))
        max_error_rate = task_cfg.get("max_error_rate", gates.get("max_error_rate"))
        max_p95_latency_ms = task_cfg.get(
            "max_p95_latency_ms", gates.get("max_p95_latency_ms")
        )
        max_mean_cost = task_cfg.get(
            "max_mean_cost_per_item_usd", gates.get("max_mean_cost_per_item_usd")
        )

        if min_mean_score is not None and result.get("mean_score", 0) < min_mean_score:
            failures.append(
                {
                    "task": task_name,
                    "model": result.get("model"),
                    "metric": "mean_score",
                    "actual": result.get("mean_score"),
                    "threshold": min_mean_score,
                    "operator": ">=",
                }
            )

        if max_error_rate is not None and result.get("error_rate", 0) > max_error_rate:
            failures.append(
                {
                    "task": task_name,
                    "model": result.get("model"),
                    "metric": "error_rate",
                    "actual": result.get("error_rate"),
                    "threshold": max_error_rate,
                    "operator": "<=",
                }
            )

        if (
            max_p95_latency_ms is not None
            and result.get("p95_latency_ms", 0) > max_p95_latency_ms
        ):
            failures.append(
                {
                    "task": task_name,
                    "model": result.get("model"),
                    "metric": "p95_latency_ms",
                    "actual": result.get("p95_latency_ms"),
                    "threshold": max_p95_latency_ms,
                    "operator": "<=",
                }
            )

        if (
            max_mean_cost is not None
            and result.get("mean_cost_per_item_usd", 0) > max_mean_cost
        ):
            failures.append(
                {
                    "task": task_name,
                    "model": result.get("model"),
                    "metric": "mean_cost_per_item_usd",
                    "actual": result.get("mean_cost_per_item_usd"),
                    "threshold": max_mean_cost,
                    "operator": "<=",
                }
            )

    return failures
