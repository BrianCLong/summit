import json
from pathlib import Path

import pytest

from summit.evidence import init_evidence_bundle


def test_init_evidence_bundle_creates_files(tmp_path):
    run_id = "TEST-RUN-001"
    paths = init_evidence_bundle(tmp_path, run_id=run_id)

    assert paths.report.exists()
    assert paths.metrics.exists()
    assert paths.stamp.exists()
    assert paths.index.exists()

def test_report_content(tmp_path):
    run_id = "TEST-RUN-002"
    paths = init_evidence_bundle(tmp_path, run_id=run_id)

    data = json.loads(paths.report.read_text())
    assert data["run_id"] == run_id
    assert "evidence_id" in data
    assert "summary" in data
    assert "artifacts" in data
    assert data["results"] == []

def test_metrics_content(tmp_path):
    run_id = "TEST-RUN-003"
    paths = init_evidence_bundle(tmp_path, run_id=run_id)

    data = json.loads(paths.metrics.read_text())
    assert data["run_id"] == run_id
    assert "evidence_id" in data
    assert "metrics" in data
    assert "counters" in data
    assert "timers_ms" in data

def test_stamp_content(tmp_path):
    run_id = "TEST-RUN-004"
    paths = init_evidence_bundle(tmp_path, run_id=run_id)

    data = json.loads(paths.stamp.read_text())
    assert data["run_id"] == run_id
    assert "evidence_id" in data
    assert "generated_at" in data
    assert "created_at" in data

    # Verify timestamp format (ISO 8601)
    assert "T" in data["generated_at"]
    assert "Z" in data["generated_at"]

def test_timestamp_isolation(tmp_path):
    """Ensure timestamps only appear in stamp.json"""
    run_id = "TEST-RUN-005"
    paths = init_evidence_bundle(tmp_path, run_id=run_id)

    # Check report for timestamps
    report_txt = paths.report.read_text()
    # Simple heuristic: shouldn't have current year + T + colon
    # But run_id might be anything.
    # The writer uses fixed strings except for run_id.

    # We can assume report shouldn't have ISO dates.
    # But checking for "202..." might trigger if run_id has it.
    # We'll just check that generated_at is NOT in report.
    stamp_data = json.loads(paths.stamp.read_text())
    ts = stamp_data["generated_at"]

    assert ts not in report_txt
    assert ts not in paths.metrics.read_text()
    assert ts not in paths.index.read_text()
