#!/usr/bin/env python3
import json
import os
import sys

try:
    import jsonschema
except ImportError:
    print("jsonschema not installed. Please install it with: pip install jsonschema")
    sys.exit(1)

def load_json(path):
    with open(path) as f:
        return json.load(f)

def check_schema(schema_path):
    print(f"Checking schema: {schema_path}")
    schema = load_json(schema_path)
    try:
        jsonschema.Draft7Validator.check_schema(schema)
        print("  Schema is valid JSON Schema.")
        return schema
    except jsonschema.exceptions.SchemaError as e:
        print(f"  FAIL: Invalid schema: {e.message}")
        return None

def validate_data(name, schema, data):
    print(f"Validating sample {name}...")
    try:
        jsonschema.validate(instance=data, schema=schema)
        print("  PASS")
        return True
    except jsonschema.ValidationError as e:
        print(f"  FAIL: {e.message}")
        return False

def main():
    base_dir = "summit/regintel/evidence/schemas"
    schemas = {
        "report": os.path.join(base_dir, "report.schema.json"),
        "metrics": os.path.join(base_dir, "metrics.schema.json"),
        "stamp": os.path.join(base_dir, "stamp.schema.json")
    }

    loaded_schemas = {}
    success = True

    for key, path in schemas.items():
        s = check_schema(path)
        if s is None:
            success = False
        else:
            loaded_schemas[key] = s

    if not success:
        sys.exit(1)

    # Sample data
    samples = {
        "report": {
            "evidence_id": "regintel/sample-item/abc1234/pipeline/001",
            "run_id": "RUN-123",
            "facts": [
                {
                    "fact_id": "FACT-1",
                    "source_snapshot_id": "SNAP-1",
                    "content": "Sample content",
                    "citations": ["Page 1"],
                    "extracted_at": "2023-01-01T00:00:00Z"
                }
            ],
            "deltas": [],
            "risk_score": {
                "total": 5,
                "breakdown": {"compliance": 5}
            }
        },
        "metrics": {
            "evidence_id": "regintel/sample-item/abc1234/pipeline/001",
            "fact_precision": 0.95,
            "fact_recall": 0.90,
            "citation_coverage": 1.0,
            "latency_seconds": 120
        },
        "stamp": {
            "evidence_id": "regintel/sample-item/abc1234/pipeline/001",
            "created_at": "2023-01-01T00:00:00Z",
            "git_commit": "abcdef123456",
            "offline_mode": False
        }
    }

    for key, data in samples.items():
        if not validate_data(key, loaded_schemas[key], data):
            success = False

    if success:
        print("\nAll RegIntel schemas verified successfully.")
        sys.exit(0)
    else:
        print("\nVerification failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
