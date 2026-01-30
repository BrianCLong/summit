import json
import pytest
from jsonschema import validate, ValidationError
from pathlib import Path

# Load schemas
SCHEMAS_DIR = Path("summit/evidence/schemas")

def load_schema(name):
    with open(SCHEMAS_DIR / name, "r") as f:
        return json.load(f)

REPORT_SCHEMA = load_schema("report.schema.json")
METRICS_SCHEMA = load_schema("metrics.schema.json")
STAMP_SCHEMA = load_schema("stamp.schema.json")
INDEX_SCHEMA = load_schema("index.schema.json")

def test_pass_bundle():
    bundle_dir = Path("tests/fixtures/evidence/pass_bundle")

    with open(bundle_dir / "report.json") as f:
        validate(instance=json.load(f), schema=REPORT_SCHEMA)

    with open(bundle_dir / "metrics.json") as f:
        validate(instance=json.load(f), schema=METRICS_SCHEMA)

    with open(bundle_dir / "stamp.json") as f:
        validate(instance=json.load(f), schema=STAMP_SCHEMA)

    with open(bundle_dir / "evidence/index.json") as f:
        validate(instance=json.load(f), schema=INDEX_SCHEMA)

def test_fail_bundle_metrics():
    # metrics.json is missing evidence_id
    bundle_dir = Path("tests/fixtures/evidence/fail_bundle_missing_metrics")

    with open(bundle_dir / "metrics.json") as f:
        with pytest.raises(ValidationError):
            validate(instance=json.load(f), schema=METRICS_SCHEMA)

def test_write_evidence_bundle(tmp_path):
    try:
        from summit.evidence.write_evidence import write_evidence_bundle
    except ImportError:
        # Fallback for when 'summit' is in pythonpath directly
        from evidence.write_evidence import write_evidence_bundle

    write_evidence_bundle(
        output_dir=tmp_path,
        evidence_id="EVD-TEST-001",
        summary="Test Summary",
        artifacts=["file1"],
        metrics={"score": 100},
        git_commit="hash123"
    )

    # Verify files exist
    assert (tmp_path / "report.json").exists()
    assert (tmp_path / "metrics.json").exists()
    assert (tmp_path / "stamp.json").exists()
    assert (tmp_path / "evidence/index.json").exists()

    # Verify content against schemas
    with open(tmp_path / "report.json") as f:
        validate(instance=json.load(f), schema=REPORT_SCHEMA)

    with open(tmp_path / "metrics.json") as f:
        validate(instance=json.load(f), schema=METRICS_SCHEMA)

    with open(tmp_path / "stamp.json") as f:
        validate(instance=json.load(f), schema=STAMP_SCHEMA)

    with open(tmp_path / "evidence/index.json") as f:
        validate(instance=json.load(f), schema=INDEX_SCHEMA)
