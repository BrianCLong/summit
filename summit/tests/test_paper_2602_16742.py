import json
from pathlib import Path

import pytest

from summit.evals.paper_2602_16742 import (
    DEFAULT_METRIC_KEY,
    evaluate_metric,
    main,
    run_evaluation,
)


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def test_evaluate_metric_within_tolerance():
    result = evaluate_metric(observed_value=85.20, target_value=85.11, tolerance=0.10)
    assert result.within_tolerance is True
    assert result.delta_abs == pytest.approx(0.09)


def test_evaluate_metric_outside_tolerance():
    result = evaluate_metric(observed_value=84.0, target_value=85.11, tolerance=0.50)
    assert result.within_tolerance is False
    assert result.delta_abs == pytest.approx(1.11)


def test_run_evaluation_writes_expected_artifacts(tmp_path):
    out_dir = tmp_path / "artifacts"
    result = run_evaluation(
        metrics_payload={DEFAULT_METRIC_KEY: 85.11},
        out_dir=out_dir,
        generated_at="2026-02-24T00:00:00Z",
    )
    assert result.within_tolerance is True

    report = _read_json(out_dir / "report.json")
    metrics = _read_json(out_dir / "metrics.json")
    stamp = _read_json(out_dir / "stamp.json")
    evidence = _read_json(out_dir / "evidence.json")

    assert report["status"] == "pass"
    assert metrics["metrics"]["within_tolerance"] is True
    assert stamp["evidence_id"] == report["evidence_id"] == metrics["evidence_id"]
    assert evidence["sha256"]["report.json"] == stamp["sha256"]["report.json"]
    assert evidence["sha256"]["metrics.json"] == stamp["sha256"]["metrics.json"]


def test_report_and_metrics_are_deterministic_across_runs(tmp_path):
    first_dir = tmp_path / "first"
    second_dir = tmp_path / "second"

    run_evaluation(
        metrics_payload={DEFAULT_METRIC_KEY: 85.05},
        out_dir=first_dir,
        generated_at="2026-02-24T00:00:00Z",
    )
    run_evaluation(
        metrics_payload={DEFAULT_METRIC_KEY: 85.05},
        out_dir=second_dir,
        generated_at="2026-02-24T00:00:01Z",
    )

    assert (first_dir / "report.json").read_text(encoding="utf-8") == (
        second_dir / "report.json"
    ).read_text(encoding="utf-8")
    assert (first_dir / "metrics.json").read_text(encoding="utf-8") == (
        second_dir / "metrics.json"
    ).read_text(encoding="utf-8")

    first_stamp = _read_json(first_dir / "stamp.json")
    second_stamp = _read_json(second_dir / "stamp.json")
    assert first_stamp["generated_at"] != second_stamp["generated_at"]
    assert first_stamp["sha256"] == second_stamp["sha256"]


def test_cli_returns_nonzero_with_fail_on_miss(tmp_path):
    metrics_path = tmp_path / "observed.json"
    metrics_path.write_text(json.dumps({DEFAULT_METRIC_KEY: 70.0}), encoding="utf-8")
    out_dir = tmp_path / "out"

    exit_code = main(
        [
            "--metrics-file",
            str(metrics_path),
            "--out-dir",
            str(out_dir),
            "--fail-on-miss",
        ]
    )
    assert exit_code == 1
