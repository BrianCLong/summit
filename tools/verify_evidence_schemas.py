#!/usr/bin/env python3
import json
import sys
import argparse
from pathlib import Path

# Constants
ROOT = Path(__file__).resolve().parents[1]
SCHEMAS_DIR = ROOT / "schemas" / "evidence"
EVIDENCE_INDEX = ROOT / "evidence" / "index.json"

def fail(msg):
    print(f"FAIL: {msg}", file=sys.stderr)
    sys.exit(1)

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        fail(f"Could not read/parse {path}: {e}")

def check_no_timestamps(data, path):
    """
    Ensures that no timestamp-like keys exist in the data.
    """
    if isinstance(data, dict):
        for key in data.keys():
            lower_key = key.lower()
            if "timestamp" in lower_key or "created_at" in lower_key or "generated_at" in lower_key:
                 fail(f"File {path} contains forbidden timestamp field '{key}'. Timestamps allowed only in stamp.json.")
        for val in data.values():
            if isinstance(val, (dict, list)):
                check_no_timestamps(val, path)
    elif isinstance(data, list):
        for item in data:
            check_no_timestamps(item, path)

def validate_file(path, schema_name):
    try:
        from jsonschema import validate, ValidationError
    except ImportError:
        print("jsonschema not installed. Skipping schema validation (checking existence only).")
        return load_json(path)

    schema_path = SCHEMAS_DIR / schema_name
    if not schema_path.exists():
        fail(f"Schema {schema_name} not found at {schema_path}")

    data = load_json(path)
    schema = load_json(schema_path)

    try:
        validate(instance=data, schema=schema)
    except ValidationError as e:
        fail(f"Validation failed for {path} against {schema_name}: {e.message}")

    return data

def main():
    parser = argparse.ArgumentParser(description="Verify evidence artifacts against schemas.")
    args = parser.parse_args()

    print(f"Verifying evidence index at {EVIDENCE_INDEX}...")
    if not EVIDENCE_INDEX.exists():
        fail(f"{EVIDENCE_INDEX} does not exist.")

    # Validate index
    index_data = validate_file(EVIDENCE_INDEX, "index.schema.json")

    items = index_data.get("items", [])
    print(f"Found {len(items)} evidence items.")

    for item in items:
        ev_id = item.get("evidence_id")
        files = item.get("files", {})

        report_path_str = files.get("report")
        metrics_path_str = files.get("metrics")
        stamp_path_str = files.get("stamp")

        if not report_path_str or not metrics_path_str or not stamp_path_str:
             fail(f"Item {ev_id} missing file paths.")

        report_path = ROOT / report_path_str
        metrics_path = ROOT / metrics_path_str
        stamp_path = ROOT / stamp_path_str

        if not report_path.exists(): fail(f"Report file missing: {report_path}")
        if not metrics_path.exists(): fail(f"Metrics file missing: {metrics_path}")
        if not stamp_path.exists(): fail(f"Stamp file missing: {stamp_path}")

        # Validate each file
        report_data = validate_file(report_path, "report.schema.json")
        check_no_timestamps(report_data, report_path)

        metrics_data = validate_file(metrics_path, "metrics.schema.json")
        check_no_timestamps(metrics_data, metrics_path)

        validate_file(stamp_path, "stamp.schema.json")
        # stamp.json IS allowed to have timestamps.

    print("Verification successful.")

if __name__ == "__main__":
    main()
