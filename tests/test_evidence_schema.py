import json
from pathlib import Path

import pytest
from jsonschema import validate

SCHEMA_DIR = Path("evidence/schema")
FIXTURE_DIR = Path("evidence/fixtures/minimal_run")

def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))

def test_report_schema():
    schema = load_json(SCHEMA_DIR / "report.schema.json")
    data = load_json(FIXTURE_DIR / "report.json")
    validate(instance=data, schema=schema)

def test_metrics_schema():
    schema = load_json(SCHEMA_DIR / "metrics.schema.json")
    data = load_json(FIXTURE_DIR / "metrics.json")
    validate(instance=data, schema=schema)

def test_stamp_schema():
    schema = load_json(SCHEMA_DIR / "stamp.schema.json")
    data = load_json(FIXTURE_DIR / "stamp.json")
    validate(instance=data, schema=schema)

def test_index_schema():
    schema = load_json(SCHEMA_DIR / "index.schema.json")
    data = load_json(FIXTURE_DIR / "index.json")
    validate(instance=data, schema=schema)
