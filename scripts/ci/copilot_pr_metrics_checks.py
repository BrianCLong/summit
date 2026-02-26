"""Validation checks for Copilot PR metrics scaffold artifacts."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
METRICS_PATH = ROOT / "evidence/copilot_pr_metrics/metrics.json"
STAMP_PATH = ROOT / "evidence/copilot_pr_metrics/stamp.json"


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def check_metrics_schema_validate() -> None:
    metrics = _load(METRICS_PATH)
    required_top = {"evidence_id", "item", "metrics", "schema_version", "source"}
    missing = sorted(required_top - set(metrics.keys()))
    if missing:
        raise SystemExit(f"metrics-schema-validate failed; missing keys: {missing}")

    metric_keys = list(metrics["metrics"].keys())
    if metric_keys != sorted(metric_keys):
        raise SystemExit("metrics-schema-validate failed; metric keys must be sorted")


def check_deterministic_output() -> None:
    metrics_raw = METRICS_PATH.read_text(encoding="utf-8")
    if "created_at" in metrics_raw or "generated_at" in metrics_raw:
        raise SystemExit("deterministic-output-check failed; unstable timestamp field detected")


def check_no_unstable_fields() -> None:
    stamp = _load(STAMP_PATH)
    unstable = stamp.get("unstable_fields")
    if unstable != []:
        raise SystemExit(f"no-unstable-fields failed; expected [], got {unstable!r}")


if __name__ == "__main__":
    check_metrics_schema_validate()
    check_deterministic_output()
    check_no_unstable_fields()
    print("copilot_pr_metrics checks: PASS")
