import json
from pathlib import Path

import pytest

from summit.evidence.finance_writer import add_artifact, init_finance_evidence, set_metric

SCHEMAS_DIR = Path("summit/evidence/schemas")

def load_schema(name):
    return json.loads((SCHEMAS_DIR / name).read_text())

def validate(instance, schema):
    try:
        from jsonschema import validate
        validate(instance=instance, schema=schema)
    except ImportError:
        for req in schema.get("required", []):
            assert req in instance

def test_finance_evidence_generation(tmp_path):
    root = tmp_path / "evidence"
    root.mkdir()
    evidence_id = "EVD-TEST-FINANCE-001"
    summary = "Test Finance Evidence"
    run_id = "RUN-123"

    paths = init_finance_evidence(root, evidence_id, summary, run_id)

    assert paths.report.exists()
    assert paths.metrics.exists()
    assert paths.stamp.exists()
    assert paths.index.exists()

    report = json.loads(paths.report.read_text())
    assert report["evidence_id"] == evidence_id
    assert report["summary"] == summary
    validate(report, load_schema("finance_report.schema.json"))

    metrics = json.loads(paths.metrics.read_text())
    assert metrics["evidence_id"] == evidence_id
    validate(metrics, load_schema("finance_metrics.schema.json"))

    stamp = json.loads(paths.stamp.read_text())
    assert stamp["evidence_id"] == evidence_id
    validate(stamp, load_schema("finance_stamp.schema.json"))

    add_artifact(paths, "some/artifact.txt")
    report = json.loads(paths.report.read_text())
    assert "some/artifact.txt" in report["artifacts"]
    validate(report, load_schema("finance_report.schema.json"))

    set_metric(paths, "pii_leak_rate", 0)
    metrics = json.loads(paths.metrics.read_text())
    assert metrics["metrics"]["pii_leak_rate"] == 0
    validate(metrics, load_schema("finance_metrics.schema.json"))
