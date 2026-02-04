import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

TOOLS_DIR = os.path.join(os.path.dirname(__file__), '../tools')
EVIDENCE_VALIDATE_SCRIPT = os.path.join(TOOLS_DIR, 'evidence_validate.py')

@pytest.fixture
def temp_evidence_dir(tmp_path):
    # Setup schemas
    schemas_dir = tmp_path / "schemas"
    schemas_dir.mkdir()

    report_schema = {
        "type": "object",
        "required": ["evidence_id", "summary", "artifacts"],
        "properties": {
            "evidence_id": {"type": "string"},
            "summary": {"type": "string"},
            "artifacts": {"type": "array", "items": {"type": "string"}}
        },
        "additionalProperties": False
    }

    metrics_schema = {"type": "object", "additionalProperties": True}

    stamp_schema = {
        "type": "object",
        "properties": {"generated_at": {"type": "string"}},
        "additionalProperties": False
    }

    index_schema = {
        "type": "object",
        "required": ["items"],
        "properties": {
            "version": {"type": "number"},
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["id", "path"],
                    "properties": {
                        "id": {"type": "string"},
                        "path": {"type": "string"}
                    }
                }
            }
        }
    }

    with open(schemas_dir / "report.schema.json", "w") as f:
        json.dump(report_schema, f)
    with open(schemas_dir / "metrics.schema.json", "w") as f:
        json.dump(metrics_schema, f)
    with open(schemas_dir / "stamp.schema.json", "w") as f:
        json.dump(stamp_schema, f)
    with open(schemas_dir / "index.schema.json", "w") as f:
        json.dump(index_schema, f)

    # Setup evidence
    evidence_dir = tmp_path / "evidence"
    evidence_dir.mkdir()

    return schemas_dir, evidence_dir

def test_evidence_validate_success(temp_evidence_dir):
    schemas_dir, evidence_dir = temp_evidence_dir

    ev_dir = evidence_dir / "EVD-TEST-001"
    ev_dir.mkdir()

    with open(ev_dir / "report.json", "w") as f:
        json.dump({"evidence_id": "EVD-TEST-001", "summary": "test", "artifacts": []}, f)
    with open(ev_dir / "metrics.json", "w") as f:
        json.dump({"hits": 10}, f)
    with open(ev_dir / "stamp.json", "w") as f:
        json.dump({"generated_at": "2023-01-01T00:00:00Z"}, f)

    index = {
        "version": 1,
        "items": [
            {"id": "EVD-TEST-001", "path": str(ev_dir)}
        ]
    }
    with open(evidence_dir / "index.json", "w") as f:
        json.dump(index, f)

    result = subprocess.run(
        ["python", EVIDENCE_VALIDATE_SCRIPT, "--schemas", str(schemas_dir), "--evidence", str(evidence_dir)],
        capture_output=True,
        text=True
    )

    assert result.returncode == 0
    assert "Validation successful" in result.stdout

def test_evidence_validate_fail_schema(temp_evidence_dir):
    schemas_dir, evidence_dir = temp_evidence_dir

    ev_dir = evidence_dir / "EVD-TEST-002"
    ev_dir.mkdir()

    # Invalid report (missing artifacts)
    with open(ev_dir / "report.json", "w") as f:
        json.dump({"evidence_id": "EVD-TEST-002", "summary": "test"}, f)
    with open(ev_dir / "metrics.json", "w") as f:
        json.dump({}, f)
    with open(ev_dir / "stamp.json", "w") as f:
        json.dump({"generated_at": "2023-01-01"}, f)

    index = {
        "version": 1,
        "items": [
            {"id": "EVD-TEST-002", "path": str(ev_dir)}
        ]
    }
    with open(evidence_dir / "index.json", "w") as f:
        json.dump(index, f)

    result = subprocess.run(
        ["python", EVIDENCE_VALIDATE_SCRIPT, "--schemas", str(schemas_dir), "--evidence", str(evidence_dir)],
        capture_output=True,
        text=True
    )

    assert result.returncode == 1
    assert "Validation failed" in result.stdout

def test_evidence_validate_fail_timestamp(temp_evidence_dir):
    schemas_dir, evidence_dir = temp_evidence_dir

    ev_dir = evidence_dir / "EVD-TEST-003"
    ev_dir.mkdir()

    # Report contains timestamp (forbidden)
    with open(ev_dir / "report.json", "w") as f:
        json.dump({"evidence_id": "EVD-TEST-003", "summary": "test", "artifacts": [], "created_at": "now"}, f)
    with open(ev_dir / "metrics.json", "w") as f:
        json.dump({}, f)
    with open(ev_dir / "stamp.json", "w") as f:
        json.dump({"generated_at": "now"}, f)

    index = {
        "version": 1,
        "items": [
            {"id": "EVD-TEST-003", "path": str(ev_dir)}
        ]
    }
    with open(evidence_dir / "index.json", "w") as f:
        json.dump(index, f)

    result = subprocess.run(
        ["python", EVIDENCE_VALIDATE_SCRIPT, "--schemas", str(schemas_dir), "--evidence", str(evidence_dir)],
        capture_output=True,
        text=True
    )

    assert result.returncode == 1
    assert "Timestamp field 'created_at' found" in result.stdout
