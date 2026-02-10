import json
import pytest
from jsonschema import validate
from pathlib import Path

SCHEMA_DIR = Path("src/summit/agentkit/evidence/schemas")
EVIDENCE_DIR = Path("evidence")

def test_index_schema_valid():
    with open(SCHEMA_DIR / "index.schema.json") as f:
        schema = json.load(f)
    with open(EVIDENCE_DIR / "index.json") as f:
        data = json.load(f)
    validate(instance=data, schema=schema)

def test_report_schema_valid():
    with open(SCHEMA_DIR / "report.schema.json") as f:
        schema = json.load(f)
    with open(EVIDENCE_DIR / "report.json") as f:
        data = json.load(f)
    validate(instance=data, schema=schema)
