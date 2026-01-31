#!/usr/bin/env python3
"""
Validates a Summit Evidence Bundle (Lane 1 PR1 requirement).
Usage: evidence_validate_bundle.py <bundle_dir>
"""
import argparse
import json
import re
import sys
from pathlib import Path

# Schemas are in summit/evidence/schemas/
ROOT = Path(__file__).resolve().parents[2]
SCHEMA_DIR = ROOT / "summit/evidence/schemas"

def die(msg):
    print(f"FAIL: {msg}", file=sys.stderr)
    sys.exit(1)

def check_timestamps(data, filename):
    if filename.endswith("stamp.json"):
        return

    def _walk(obj, path=""):
        if isinstance(obj, dict):
            for k, v in obj.items():
                # Use word boundaries to avoid false positives (e.g., 'candidate', 'validation')
                if re.search(r'\b(?:time|date|timestamp|generated_at|created_at)\b', k, re.IGNORECASE):
                    die(f"Timestamp key '{k}' found in {filename} (only allowed in stamp.json)")
                _walk(v, f"{path}.{k}")
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                _walk(item, f"{path}[{i}]")
    _walk(data)

def check_stable_keys(path):
    # Read raw content
    content = path.read_text(encoding="utf-8")
    try:
        data = json.loads(content)
    except Exception as e:
        die(f"Invalid JSON in {path}: {e}")

    # Check that keys are sorted in the dict (assuming json.load preserves order, which is true for Py3.7+)
    def _check_order(obj, path_str=""):
        if isinstance(obj, dict):
            keys = list(obj.keys())
            if keys != sorted(keys):
                 die(f"Keys not sorted in {path} at '{path_str}'. Found {keys[:5]}...")
            for k, v in obj.items():
                _check_order(v, f"{path_str}.{k}")
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                _check_order(item, f"{path_str}[{i}]")

    _check_order(data)

def validate_schema(data, schema_name):
    try:
        import jsonschema
    except ImportError:
        print("WARN: jsonschema not installed, skipping schema validation")
        return

    schema_path = SCHEMA_DIR / schema_name
    if not schema_path.exists():
        die(f"Schema not found: {schema_path}")

    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    try:
        jsonschema.validate(instance=data, schema=schema)
    except jsonschema.ValidationError as e:
        die(f"Schema validation failed for {schema_name}: {e.message}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("bundle_dir", help="Path to evidence bundle directory")
    args = parser.parse_args()

    bundle = Path(args.bundle_dir)
    if not bundle.exists():
        die(f"Bundle directory not found: {bundle}")

    # Check index.json
    index_path = bundle / "evidence/index.json"
    if not index_path.exists():
        die(f"Missing index.json at {index_path}")

    check_stable_keys(index_path)
    index_data = json.loads(index_path.read_text())
    check_timestamps(index_data, "index.json")
    validate_schema(index_data, "evidence.index.schema.json")

    # Check items in index
    if "evidence" not in index_data:
        die("index.json missing 'evidence' list")

    for item in index_data["evidence"]:
        path_str = item.get("path")
        if not path_str:
            die("Evidence item missing path")

        full_path = bundle / path_str
        if not full_path.exists():
            die(f"Evidence file missing: {full_path}")

        check_stable_keys(full_path)
        data = json.loads(full_path.read_text())
        check_timestamps(data, path_str)

        # Use schema_path if available
        schema_name = item.get("schema_path")
        if schema_name:
            validate_schema(data, schema_name)
        elif "report.json" in path_str:
             validate_schema(data, "evidence.report.schema.json")
        elif "metrics.json" in path_str:
             validate_schema(data, "evidence.metrics.schema.json")
        elif "stamp.json" in path_str:
             validate_schema(data, "evidence.stamp.schema.json")

    print("PASS: Bundle is valid.")

if __name__ == "__main__":
    main()
