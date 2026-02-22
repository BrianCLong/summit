import json
import os

import jsonschema
import pytest

EVIDENCE_DIR = os.path.join(os.path.dirname(__file__), "../summit/evidence")
SCHEMAS_DIR = os.path.join(EVIDENCE_DIR, "schemas")
EXAMPLES_DIR = os.path.join(EVIDENCE_DIR, "examples")

def load_json(path):
    with open(path) as f:
        return json.load(f)

def test_report_schema():
    schema = load_json(os.path.join(SCHEMAS_DIR, "report.schema.json"))
    example = load_json(os.path.join(EXAMPLES_DIR, "report.json"))
    jsonschema.validate(instance=example, schema=schema)

def test_metrics_schema():
    schema = load_json(os.path.join(SCHEMAS_DIR, "metrics.schema.json"))
    example = load_json(os.path.join(EXAMPLES_DIR, "metrics.json"))
    jsonschema.validate(instance=example, schema=schema)

def test_stamp_schema():
    schema = load_json(os.path.join(SCHEMAS_DIR, "stamp.schema.json"))
    example = load_json(os.path.join(EXAMPLES_DIR, "stamp.json"))
    jsonschema.validate(instance=example, schema=schema)

def test_index_schema():
    schema = load_json(os.path.join(SCHEMAS_DIR, "index.schema.json"))
    index = load_json(os.path.join(EVIDENCE_DIR, "index.json"))
    jsonschema.validate(instance=index, schema=schema)
