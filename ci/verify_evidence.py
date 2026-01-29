#!/usr/bin/env python3
import argparse
import json
import os
import sys
from typing import Dict, Any, List

# Try to import jsonschema, but don't fail immediately if missing
# (though it's required for full validation)
try:
    import jsonschema
    from jsonschema import validate
except ImportError:
    jsonschema = None

def load_json(path: str) -> Any:
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"FAIL: Invalid JSON in {path}: {e}")
        sys.exit(1)

def validate_schema(instance: Any, schema_path: str):
    if not jsonschema:
        print(f"WARNING: jsonschema not installed, skipping schema validation for {schema_path}")
        return

    if not os.path.exists(schema_path):
        print(f"ERROR: Schema not found at {schema_path}")
        sys.exit(1)

    schema = load_json(schema_path)
    try:
        validate(instance=instance, schema=schema)
        print(f"PASS: Schema validation for {os.path.basename(schema_path)}")
    except jsonschema.exceptions.ValidationError as e:
        print(f"FAIL: Schema validation failed for {os.path.basename(schema_path)}")
        print(e)
        sys.exit(1)

def check_timestamps(data: Any, path: str = ""):
    """Recursively check for 'timestamp' or 'date' keys in dictionaries."""
    if isinstance(data, dict):
        for k, v in data.items():
            if ("timestamp" in k.lower() or "date" in k.lower()) and "candidate" not in k.lower():
                # "candidate" exception just in case, but strictly "timestamp" or "date"
                # The rule is "Timestamps only in stamp.json".
                # We can be strict.
                print(f"FAIL: Found timestamp-like key '{k}' in {path}. Timestamps must be in stamp.json only.")
                sys.exit(1)
            check_timestamps(v, path)
    elif isinstance(data, list):
        for item in data:
            check_timestamps(item, path)

def main():
    parser = argparse.ArgumentParser(description="Verify Summit RT-NIDS Evidence Bundle")
    parser.add_argument("--bundle", default=".", help="Path to evidence bundle directory")
    args = parser.parse_args()

    bundle_path = args.bundle

    # Define schema paths relative to repo root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(script_dir) # ci/ -> root
    schema_dir = os.path.join(repo_root, "summit/nids_rt/evidence/schemas")

    required_files = {
        "metrics.json": "rtnids_metrics.schema.json",
        "report.json": "rtnids_report.schema.json",
        "stamp.json": "rtnids_stamp.schema.json",
        "evidence/index.json": "rtnids_index.schema.json"
    }

    files_found = 0

    # Check index.json
    index_path = os.path.join(bundle_path, "evidence", "index.json")
    if os.path.exists(index_path):
        print(f"Found index at {index_path}")
        data = load_json(index_path)
        validate_schema(data, os.path.join(schema_dir, "rtnids_index.schema.json"))
        files_found += 1

    # Check other files
    for filename, schema_name in required_files.items():
        if filename == "evidence/index.json": continue

        file_path = os.path.join(bundle_path, filename)
        if os.path.exists(file_path):
            print(f"Found {filename}")
            data = load_json(file_path)
            validate_schema(data, os.path.join(schema_dir, schema_name))

            # Timestamp check (strict: only stamp.json allowed)
            if filename != "stamp.json":
                check_timestamps(data, filename)

            files_found += 1

    if files_found == 0:
        print("INFO: No RT-NIDS evidence files found in bundle path. This is expected if the bundle hasn't been generated yet.")

    print("Verification complete.")

if __name__ == "__main__":
    main()
