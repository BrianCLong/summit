import json
import os
import pytest
from jsonschema import validate

SCHEMAS_DIR = "evidence/schemas"

def load_json(filepath):
    with open(filepath) as f:
        return json.load(f)

def test_ci_cise_v4_schema():
    schema_path = os.path.join(SCHEMAS_DIR, "ci_cise_v4.schema.json")
    assert os.path.exists(schema_path), f"Schema not found at {schema_path}"

    schema = load_json(schema_path)
    valid_data = {
        "target": {
            "name": "Summit",
            "type": "repo",
            "slug": "summit-repo"
        },
        "run": {
            "date": "2024-01-01",
            "analyst": "agentic",
            "scope": ["public_docs"]
        },
        "sources": [
            {
                "id": "S001",
                "title": "Readme",
                "url": "https://github.com/summit/summit",
                "license_hint": "MIT",
                "excerpt_sha256": "deadbeef",
                "notes": "Main readme"
            }
        ],
        "claims": [
            {
                "id": "C001",
                "claim": "Summit is great",
                "evidence": ["S001"],
                "confidence": "high",
                "type": "fact"
            }
        ]
    }
    validate(instance=valid_data, schema=schema)
