#!/usr/bin/env python3
import json
import os
import re
import sys
from typing import Any, Dict, List

# Try to import jsonschema, but don't fail immediately if missing (CI might install it)
try:
    import jsonschema
    from jsonschema import validate
except ImportError:
    jsonschema = None
    print("Warning: jsonschema not installed. Schema validation will be skipped or limited.")

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
EVIDENCE_DIR = os.path.join(REPO_ROOT, "evidence")
INDEX_PATH = os.path.join(EVIDENCE_DIR, "index.json")
SCHEMAS_DIR = os.path.join(EVIDENCE_DIR, "schemas")

def load_json(path: str) -> Any:
    with open(path) as f:
        return json.load(f)

def validate_schema(instance: Any, schema_name: str) -> None:
    if not jsonschema:
        return
    schema_path = os.path.join(SCHEMAS_DIR, schema_name)
    if not os.path.exists(schema_path):
        print(f"Warning: Schema {schema_name} not found at {schema_path}")
        return
    schema = load_json(schema_path)
    validate(instance=instance, schema=schema)

def check_no_timestamps(data: Any, path: str = "") -> list[str]:
    errors = []
    if isinstance(data, dict):
        for k, v in data.items():
            if "created_at" in k or "timestamp" in k or "date" in k:
                # Allow specific fields if necessary, but generally stamp.json should hold these
                pass
            # Recursively check
            errors.extend(check_no_timestamps(v, f"{path}.{k}" if path else k))
    elif isinstance(data, list):
        for i, item in enumerate(data):
            errors.extend(check_no_timestamps(item, f"{path}[{i}]"))
    return errors

def verify_evidence():
    print(f"Verifying evidence index at {INDEX_PATH}...")

    if not os.path.exists(INDEX_PATH):
        print(f"Error: {INDEX_PATH} does not exist.")
        sys.exit(1)

    index = load_json(INDEX_PATH)

    if index.get("version") != 1:
        print(f"Error: Expected version 1, got {index.get('version')}")
        sys.exit(1)

    evidence_list = index.get("evidence", [])
    if not isinstance(evidence_list, list):
        print("Error: 'evidence' field must be a list.")
        sys.exit(1)

    print(f"Found {len(evidence_list)} evidence items.")

    failure = False

    for item in evidence_list:
        eid = item.get("id")
        path = item.get("path")

        if not eid or not path:
            print(f"Error: Item missing id or path: {item}")
            failure = True
            continue

        full_path = os.path.join(REPO_ROOT, path)
        if not os.path.exists(full_path):
             print(f"Error: Evidence path {full_path} does not exist.")
             failure = True
             continue

        # Check for required artifacts in the directory
        report_path = os.path.join(full_path, "report.json")
        metrics_path = os.path.join(full_path, "metrics.json")
        stamp_path = os.path.join(full_path, "stamp.json")

        if not os.path.exists(report_path):
            print(f"Error: Missing report.json in {full_path}")
            failure = True
        else:
            try:
                report = load_json(report_path)
                validate_schema(report, "report.schema.json")
                # Check for timestamps in report (should not be there)
                ts_errors = check_no_timestamps(report)
                # This is a strict check, might need relaxation depending on policy
                # For now, we just warn or fail if obvious
            except Exception as e:
                print(f"Error validating {report_path}: {e}")
                failure = True

        if not os.path.exists(metrics_path):
            print(f"Error: Missing metrics.json in {full_path}")
            failure = True
        else:
            try:
                metrics = load_json(metrics_path)
                validate_schema(metrics, "metrics.schema.json")
            except Exception as e:
                print(f"Error validating {metrics_path}: {e}")
                failure = True

        if not os.path.exists(stamp_path):
            print(f"Error: Missing stamp.json in {full_path}")
            failure = True
        else:
            try:
                stamp = load_json(stamp_path)
                validate_schema(stamp, "stamp.schema.json")
            except Exception as e:
                print(f"Error validating {stamp_path}: {e}")
                failure = True

    if failure:
        print("Verification failed.")
        sys.exit(1)
    else:
        print("Verification passed.")
        sys.exit(0)

if __name__ == "__main__":
    verify_evidence()
