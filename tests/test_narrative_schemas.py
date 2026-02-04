import json
import os
import jsonschema
import pytest

SCHEMA_DIR = "summit/narrative/schemas"

def load_schema(name):
    path = os.path.join(SCHEMA_DIR, name)
    with open(path) as f:
        return json.load(f)

def test_narrative_report_schema_valid():
    schema = load_schema("narrative.report.schema.json")
    valid_data = {
        "evidence_id": "EVD-NARRATIVE-TEST-001",
        "summary": "Test summary",
        "artifacts": ["path/to/artifact"]
    }
    jsonschema.validate(instance=valid_data, schema=schema)

def test_narrative_report_schema_invalid_id():
    schema = load_schema("narrative.report.schema.json")
    invalid_data = {
        "evidence_id": "INVALID-ID",
        "summary": "Test summary",
        "artifacts": []
    }
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(instance=invalid_data, schema=schema)

def test_narrative_metrics_schema_valid():
    schema = load_schema("narrative.metrics.schema.json")
    valid_data = {
        "evidence_id": "EVD-NARRATIVE-TEST-001",
        "metrics": {
            "score": 0.95,
            "drift": "high"
        }
    }
    jsonschema.validate(instance=valid_data, schema=schema)

def test_narrative_stamp_schema_valid():
    schema = load_schema("narrative.stamp.schema.json")
    valid_data = {
        "evidence_id": "EVD-NARRATIVE-TEST-001",
        "versions": {"model": "v1"},
        "hashes": {"data": "sha256:..."}
    }
    jsonschema.validate(instance=valid_data, schema=schema)
