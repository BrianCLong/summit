#!/usr/bin/env python3
import argparse
import json
import os
import re
import sys
from pathlib import Path

from jsonschema import ValidationError, validate

# Regex to detect ISO 8601 timestamps
TIMESTAMP_REGEX = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}')

def load_json(path):
    with open(path) as f:
        return json.load(f)

def validate_schema(data, schema_path):
    try:
        with open(schema_path) as f:
            schema = json.load(f)
        validate(instance=data, schema=schema)
        return True, None
    except Exception as e:
        return False, str(e)

def scan_for_timestamps(data, path=""):
    """Recursively scan for timestamp-like strings."""
    issues = []
    if isinstance(data, dict):
        for k, v in data.items():
            issues.extend(scan_for_timestamps(v, f"{path}.{k}" if path else k))
    elif isinstance(data, list):
        for i, v in enumerate(data):
            issues.extend(scan_for_timestamps(v, f"{path}[{i}]"))
    elif isinstance(data, str):
        if TIMESTAMP_REGEX.match(data):
            issues.append(f"Found timestamp in {path}: {data}")
    return issues

def main():
    root_dir = Path("evidence")
    schemas_dir = root_dir / "schemas"

    if not root_dir.exists():
        print(f"Error: {root_dir} does not exist.")
        sys.exit(1)

    has_error = False

    # 1. Validate index.json
    index_path = root_dir / "index.json"
    if index_path.exists():
        print(f"Validating {index_path}...")
        # We don't have an explicit schema for the new index structure in the prompt diffs
        # but we can check if it parses.
        try:
            index_data = load_json(index_path)
            # Basic structural check based on prompt
            if "version" not in index_data or "items" not in index_data:
                print(f"Error: {index_path} missing version or items.")
                has_error = True
        except Exception as e:
             print(f"Error parsing {index_path}: {e}")
             has_error = True
    else:
        print(f"Warning: {index_path} not found.")

    # 2. Walk evidence directory and validate known patterns
    # IGNORE LEGACY DIRS for now to allow new strict schemas
    IGNORED_DIRS = {"subsumption", "azure-turin-v7", "project19", "context", "ecosystem", "fixtures", "governance", "jules", "mcp", "mcp-apps", "runs", "runtime", "schemas"}

    for fpath in root_dir.rglob("*.json"):
        # Skip schemas themselves and ignored dirs
        parts = set(fpath.parts)
        if not parts.isdisjoint(IGNORED_DIRS):
            continue

        # Only validate if inside an Evidence ID directory (EVD-...)
        # We check if any parent part matches EVD- pattern
        if not any(p.startswith("EVD-") for p in fpath.parts):
            continue

        fname = fpath.name
        rel_path = fpath.relative_to(root_dir)

        print(f"Checking {rel_path}...")

        try:
            data = load_json(fpath)
        except Exception as e:
            print(f"  Error parsing JSON: {e}")
            has_error = True
            continue

        # Check for timestamps (except in stamp.json)
        if "stamp" not in fname:
            issues = scan_for_timestamps(data)
            if issues:
                for issue in issues:
                    print(f"  Timestamp Violation: {issue}")
                has_error = True

        # Schema validation
        schema_file = None
        if fname == "report.json":
            schema_file = schemas_dir / "report.schema.json"
        elif fname == "metrics.json":
            schema_file = schemas_dir / "metrics.schema.json"
        elif fname == "stamp.json":
            schema_file = schemas_dir / "stamp.schema.json"
        elif fname == "exec_brief_pack.json":
            schema_file = schemas_dir / "exec_brief_pack.schema.json"

        if schema_file and schema_file.exists():
            valid, err = validate_schema(data, schema_file)
            if not valid:
                print(f"  Schema Validation Error ({schema_file.name}): {err}")
                has_error = True
        elif schema_file:
             print(f"  Warning: Schema {schema_file} not found.")

    if has_error:
        print("Validation FAILED.")
        sys.exit(1)
    else:
        print("Validation PASSED.")

if __name__ == "__main__":
    main()
