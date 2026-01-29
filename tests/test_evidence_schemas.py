import json
import os
import sys

try:
    from jsonschema import validate, ValidationError, FormatChecker
except ImportError:
    print("jsonschema not found")
    sys.exit(1)

SCHEMAS_DIR = "retrieval/evidence"

def load_schema(filename):
    with open(os.path.join(SCHEMAS_DIR, filename), "r") as f:
        return json.load(f)

def test_report_schema():
    print("Testing report schema...")
    schema = load_schema("schema_report.json")
    valid_data = {
        "run_id": "123",
        "plan": {},
        "query_intent": "search",
        "summary": "results"
    }
    validate(instance=valid_data, schema=schema)

    invalid_data = {
        "run_id": "123",
        "plan": {},
        "query_intent": "search",
        "summary": "results",
        "timestamp": "now" # Not allowed
    }
    try:
        validate(instance=invalid_data, schema=schema)
        print("FAIL: Invalid report data passed validation")
        sys.exit(1)
    except ValidationError:
        pass
    print("PASS")

def test_metrics_schema():
    print("Testing metrics schema...")
    schema = load_schema("schema_metrics.json")
    valid_data = {
        "latency_ms": 100.0,
        "recall_at_k": 0.5
    }
    validate(instance=valid_data, schema=schema)
    print("PASS")

def test_stamp_schema():
    print("Testing stamp schema...")
    schema = load_schema("schema_stamp.json")
    valid_data = {
        "created_at": "2023-10-27T10:00:00Z",
        "version": "1.0"
    }
    validate(instance=valid_data, schema=schema, format_checker=FormatChecker())

    invalid_data = {
        "created_at": "not-a-date"
    }
    try:
        validate(instance=invalid_data, schema=schema, format_checker=FormatChecker())
        print("FAIL: Invalid stamp data passed validation")
        sys.exit(1)
    except ValidationError:
        pass
    print("PASS")

def test_index_schema():
    print("Testing index schema...")
    schema = load_schema("schema_index.json")
    valid_data = {
        "EVD-overengineered-retrieval-TEST-001": {
            "file": "path/to/file",
            "hash": "abc"
        }
    }
    validate(instance=valid_data, schema=schema)
    print("PASS")

if __name__ == "__main__":
    test_report_schema()
    test_metrics_schema()
    test_stamp_schema()
    test_index_schema()
