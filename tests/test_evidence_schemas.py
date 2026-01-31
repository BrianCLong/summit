import json
import os

import pytest
from jsonschema import validate

SCHEMAS_DIR = "schemas/evidence"

def load_json(filepath):
    with open(filepath) as f:
        return json.load(f)

def test_report_schema():
    schema = load_json(os.path.join(SCHEMAS_DIR, "report.schema.json"))
    valid_data = {
        "evidence_id": "EVD-PSYCH_ABM_LLM-ARCH-001",
        "summary": "Test summary",
        "artifacts": [
            {"path": "some/path", "description": "desc"}
        ]
    }
    validate(instance=valid_data, schema=schema)

def test_metrics_schema():
    schema = load_json(os.path.join(SCHEMAS_DIR, "metrics.schema.json"))
    valid_data = {
        "metrics": {
            "score": 0.9,
            "latency": 100
        }
    }
    validate(instance=valid_data, schema=schema)

def test_stamp_schema():
    schema = load_json(os.path.join(SCHEMAS_DIR, "stamp.schema.json"))
    valid_data = {
        "created_at": "2023-10-27T10:00:00Z",
        "version": "1.0.0",
        "git_commit": "abcdef"
    }
    validate(instance=valid_data, schema=schema)

def test_index_schema():
    schema = load_json(os.path.join(SCHEMAS_DIR, "index.schema.json"))
    valid_data = {
        "version": 1,
        "items": [
            {
                "evidence_id": "EVD-PSYCH_ABM_LLM-ARCH-001",
                "report": "evidence/report.json",
                "metrics": "evidence/metrics.json",
                "stamp": "evidence/stamp.json"
            }
        ]
    }
    validate(instance=valid_data, schema=schema)
