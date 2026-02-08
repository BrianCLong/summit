import json
import os
import pytest
from jsonschema import validate

SCHEMA_PATH = "packages/cogsec_fusion/schema/cogsec_v1.json"

def load_schema():
    with open(SCHEMA_PATH, 'r') as f:
        return json.load(f)

def test_schema_validity():
    schema = load_schema()
    assert schema["title"] == "Cognitive Security Fusion Graph"

def test_incident_node_validation():
    schema = load_schema()
    # Construct a valid graph
    data = {
        "nodes": [
            {"id": "inc-1", "type": "Incident", "description": "Test Incident", "timestamp": "2026-02-07T12:00:00Z"}
        ],
        "edges": []
    }
    validate(instance=data, schema=schema)

def test_invalid_node():
    schema = load_schema()
    data = {
        "nodes": [
            {"id": "inc-1", "type": "Incident"} # Missing description/timestamp
        ],
        "edges": []
    }
    with pytest.raises(Exception): # validate raises ValidationError
        validate(instance=data, schema=schema)
