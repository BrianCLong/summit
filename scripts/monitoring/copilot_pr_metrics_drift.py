"""Drift detector for Copilot PR metrics evidence lane."""

from __future__ import annotations

import json
from pathlib import Path

CURRENT = Path("evidence/copilot_pr_metrics/metrics.json")
BASELINE = Path("evidence/copilot_pr_metrics/baseline.json")


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _ratio(current: float, baseline: float) -> float:
    if baseline == 0:
        return 0.0
    return (current - baseline) / baseline


def main() -> int:
    if not CURRENT.exists() or not BASELINE.exists():
        print("drift: baseline or current metric file missing; intentionally constrained")
        return 0

    current = _load(CURRENT)["metrics"]
    baseline = _load(BASELINE)["metrics"]

    throughput_drop = _ratio(current.get("pr_throughput") or 0.0, baseline.get("pr_throughput") or 0.0)
    merge_time_jump = _ratio(current.get("time_to_merge_hours") or 0.0, baseline.get("time_to_merge_hours") or 0.0)

    failures: list[str] = []
    if throughput_drop <= -0.2:
        failures.append("throughput dropped by >=20%")
    if merge_time_jump >= 1.0:
        failures.append("time_to_merge_hours increased by >=100%")

    if failures:
        print("drift: FAIL - " + "; ".join(failures))
        return 1

    print("drift: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
