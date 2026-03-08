#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from statistics import median


def main() -> int:
    baseline_path = Path("artifacts/flexnode/selection_report.json")
    current_path = Path("artifacts/flexnode/current_selection_report.json")
    output_dir = Path("artifacts/flexnode")

    baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
    current = json.loads(current_path.read_text(encoding="utf-8")) if current_path.exists() else baseline

    baseline_candidates = baseline["ranked_candidates"]
    current_candidates = current["ranked_candidates"]

    baseline_pool = {c["instance_type"] for c in baseline_candidates}
    current_pool = {c["instance_type"] for c in current_candidates}

    removed = sorted(list(baseline_pool - current_pool))
    pool_shrink_pct = 0.0
    if baseline_pool:
        pool_shrink_pct = round((len(removed) / len(baseline_pool)) * 100.0, 2)

    baseline_cost = median(c["hourly_cost_usd"] for c in baseline_candidates)
    current_cost = median(c["hourly_cost_usd"] for c in current_candidates)
    cost_shift_pct = 0.0
    if baseline_cost > 0:
        cost_shift_pct = round(((current_cost - baseline_cost) / baseline_cost) * 100.0, 2)

    drift_report = {
        "alert": pool_shrink_pct > 20.0 or abs(cost_shift_pct) > 10.0,
        "pool_shrink_pct": pool_shrink_pct,
        "removed_instance_types": removed,
        "cost_median_shift_pct": cost_shift_pct,
    }
    trend_metrics = {
        "baseline_pool_size": len(baseline_pool),
        "current_pool_size": len(current_pool),
        "baseline_median_cost": baseline_cost,
        "current_median_cost": current_cost,
    }

    (output_dir / "drift_report.json").write_text(
        json.dumps(drift_report, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    (output_dir / "trend_metrics.json").write_text(
        json.dumps(trend_metrics, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print("drift-check: pass")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
