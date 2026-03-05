"""Deterministic evidence writer for GitHub Copilot PR metrics."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
import sys

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from connectors.github.copilot_metrics import normalize_copilot_pr_metrics

EVIDENCE_ID = "EVIDENCE-GH-COPILOT-PR-001"
ITEM_SLUG = "github-copilot-pr-metrics-2026"
SCHEMA_VERSION = "1.0.0"


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def build_artifacts(payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    normalized = normalize_copilot_pr_metrics(payload)

    metrics = {
        "evidence_id": EVIDENCE_ID,
        "item": ITEM_SLUG,
        "metrics": normalized,
        "schema_version": SCHEMA_VERSION,
        "source": "github.copilot.usage_metrics_api",
    }
    report = {
        "evidence_id": EVIDENCE_ID,
        "item": ITEM_SLUG,
        "summary": {
            "claims": [
                "ITEM:CLAIM-01",
                "ITEM:CLAIM-02",
                "ITEM:CLAIM-03",
            ],
            "status": "scaffold",
        },
        "artifacts": {
            "metrics": "evidence/copilot_pr_metrics/metrics.json",
            "stamp": "evidence/copilot_pr_metrics/stamp.json",
        },
    }
    stamp = {
        "evidence_id": EVIDENCE_ID,
        "item": ITEM_SLUG,
        "deterministic": True,
        "unstable_fields": [],
    }
    return report, metrics, stamp


def run(payload: dict[str, Any], output_dir: Path = Path("evidence/copilot_pr_metrics")) -> None:
    report, metrics, stamp = build_artifacts(payload)
    _write_json(output_dir / "report.json", report)
    _write_json(output_dir / "metrics.json", metrics)
    _write_json(output_dir / "stamp.json", stamp)


if __name__ == "__main__":
    # Placeholder payload for deterministic scaffold execution.
    run({"metrics": {"pr_throughput": None, "time_to_merge_hours": None}})
