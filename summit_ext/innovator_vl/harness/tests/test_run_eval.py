from __future__ import annotations

import json
from pathlib import Path

from summit_ext.innovator_vl.harness import run_eval


def _read_text(path: Path) -> str:
    return path.read_text()


def test_write_evidence_is_deterministic(tmp_path: Path) -> None:
    run_eval.write_evidence(tmp_path)

    report_path = tmp_path / "evidence" / "report.json"
    metrics_path = tmp_path / "evidence" / "metrics.json"

    report_text = _read_text(report_path)
    metrics_text = _read_text(metrics_path)

    expected_report = json.dumps(
        {"item": run_eval.ITEM_ID, "notes": [], "status": "skeleton"},
        indent=2,
        sort_keys=True,
    ) + "\n"
    expected_metrics = json.dumps(
        {"metrics": {}, "warnings": ["no model connected; skeleton only"]},
        indent=2,
        sort_keys=True,
    ) + "\n"

    assert report_text == expected_report
    assert metrics_text == expected_metrics


def test_report_metrics_exclude_stamp_fields(tmp_path: Path) -> None:
    run_eval.write_evidence(tmp_path)

    report_text = _read_text(tmp_path / "evidence" / "report.json")
    metrics_text = _read_text(tmp_path / "evidence" / "metrics.json")

    assert "generated_at_utc" not in report_text
    assert "generated_at_utc" not in metrics_text
