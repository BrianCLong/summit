#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _safe_get(mapping: dict[str, Any], dotted: str, default: Any = None) -> Any:
    cursor: Any = mapping
    for part in dotted.split("."):
        if not isinstance(cursor, dict) or part not in cursor:
            return default
        cursor = cursor[part]
    return cursor


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Detect deterministic drift for Notion-style computer-use agent artifacts."
    )
    parser.add_argument("--baseline", required=True, help="Baseline artifact directory")
    parser.add_argument("--candidate", required=True, help="Candidate artifact directory")
    parser.add_argument(
        "--out-dir",
        default="artifacts/notion-agents-drift",
        help="Output directory for drift_report.json and trend_metrics.json",
    )
    args = parser.parse_args()

    baseline_dir = Path(args.baseline)
    candidate_dir = Path(args.candidate)
    out_dir = Path(args.out_dir)

    base_report = _load_json(baseline_dir / "report.json")
    cand_report = _load_json(candidate_dir / "report.json")
    base_metrics = _load_json(baseline_dir / "metrics.json")
    cand_metrics = _load_json(candidate_dir / "metrics.json")

    base_latency = float(_safe_get(base_metrics, "metrics.simulated_latency_ms", 0))
    cand_latency = float(_safe_get(cand_metrics, "metrics.simulated_latency_ms", 0))
    latency_delta_pct = (
        0.0 if base_latency == 0 else ((cand_latency - base_latency) / base_latency) * 100.0
    )

    base_cost = float(_safe_get(base_metrics, "metrics.cost_usd", 0.0))
    cand_cost = float(_safe_get(cand_metrics, "metrics.cost_usd", 0.0))
    cost_delta = cand_cost - base_cost

    base_policy = _safe_get(base_report, "policy_name", "")
    cand_policy = _safe_get(cand_report, "policy_name", "")

    drift_report = {
        "checks": [
            {
                "name": "policy_drift",
                "ok": base_policy == cand_policy,
                "baseline": base_policy,
                "candidate": cand_policy,
            },
            {
                "name": "latency_regression_budget_15pct",
                "ok": latency_delta_pct <= 15.0,
                "value_pct": round(latency_delta_pct, 4),
            },
            {
                "name": "cost_delta_nonnegative_alert",
                "ok": cost_delta <= 0.0,
                "value_usd": round(cost_delta, 6),
            },
        ],
        "summary": "Notion agent drift detection completed deterministically.",
    }
    trend_metrics = {
        "baseline": {
            "cost_usd": base_cost,
            "latency_ms": base_latency,
            "policy_name": base_policy,
        },
        "candidate": {
            "cost_usd": cand_cost,
            "latency_ms": cand_latency,
            "policy_name": cand_policy,
        },
        "delta": {
            "cost_usd": round(cost_delta, 6),
            "latency_pct": round(latency_delta_pct, 4),
        },
    }

    _write_json(out_dir / "drift_report.json", drift_report)
    _write_json(out_dir / "trend_metrics.json", trend_metrics)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
