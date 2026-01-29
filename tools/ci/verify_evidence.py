#!/usr/bin/env python3
import json
import sys
import re
from pathlib import Path
try:
    from jsonschema import validate, ValidationError
except ImportError:
    print("jsonschema not found. Please install it.")
    sys.exit(1)

def load_json(path):
    with open(path, 'r') as f:
        return json.load(f)

def validate_schema(data, schema_path):
    schema = load_json(schema_path)
    validate(instance=data, schema=schema)

def check_timestamps(data, filename, allowed=False):
    """
    Recursively check that no timestamp keys exist in data unless allowed.
    """
    time_keys = re.compile(r'^(time|date|timestamp|generated_at|created_at).*$')

    if isinstance(data, dict):
        for k, v in data.items():
            if not allowed and time_keys.match(k):
                raise ValueError(f"Timestamp key '{k}' found in {filename}. Timestamps only allowed in stamp.json.")
            check_timestamps(v, filename, allowed)
    elif isinstance(data, list):
        for item in data:
            check_timestamps(item, filename, allowed)

def main():
    root = Path(".")
    evidence_dir = root / "evidence"
    index_path = evidence_dir / "index.json"

    if not index_path.exists():
        print(f"Error: {index_path} not found.")
        return 1

    print(f"Validating {index_path}...")
    try:
        index_data = load_json(index_path)
        validate_schema(index_data, evidence_dir / "schemas/index.schema.json")
    except Exception as e:
        print(f"Index validation failed: {e}")
        return 1

    # Extract artifacts to verify
    artifacts_to_check = []

    if "evidence" in index_data:
        # New format
        for item in index_data["evidence"]:
            files = item.get("files", {})
            artifacts_to_check.append(("report", files.get("report")))
            artifacts_to_check.append(("metrics", files.get("metrics")))
            artifacts_to_check.append(("stamp", files.get("stamp")))
    elif "items" in index_data:
         # Version 1 format
         for item in index_data["items"]:
             # Assuming structure, but if it's empty we skip
             pass
    else:
        # Dictionary format (patternProperties)
        for key, paths in index_data.items():
             # Paths is list of strings? Old schema said array of strings.
             # Assuming they are file paths?
             pass

    errors = 0
    for type_name, rel_path in artifacts_to_check:
        if not rel_path:
            continue

        file_path = root / rel_path
        if not file_path.exists():
            print(f"Error: Artifact {rel_path} not found.")
            errors += 1
            continue

        print(f"Validating {rel_path}...")
        try:
            data = load_json(file_path)

            # Schema validation
            schema_file = evidence_dir / f"schemas/{type_name}.schema.json"
            if schema_file.exists():
                validate_schema(data, schema_file)

            # Timestamp check
            is_stamp = (type_name == "stamp")
            check_timestamps(data, str(rel_path), allowed=is_stamp)

        except Exception as e:
            print(f"Error validating {rel_path}: {e}")
            errors += 1

    if errors > 0:
        print(f"Verification failed with {errors} errors.")
        return 1

    print("Verification passed.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
