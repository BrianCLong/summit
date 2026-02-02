#!/usr/bin/env python3
import json
import os
import sys
import argparse

try:
    import jsonschema
except ImportError:
    print("Error: jsonschema module not found. Please install it (e.g., pip install jsonschema).")
    sys.exit(1)

# Schema paths
SCHEMA_DIR = "schemas"
INDEX_SCHEMA_PATH = os.path.join(SCHEMA_DIR, "evidence.index.schema.json")

# Forbidden keys in report/metrics
FORBIDDEN_KEYS = ["timestamp", "created_at", "date", "time"]

def load_json(path):
    with open(path, 'r') as f:
        return json.load(f)

def validate_schema(data, schema_path):
    if not os.path.exists(schema_path):
        # Fail if schema is missing for a target artifact
        print(f"Error: Schema not found at {schema_path}")
        return False
    try:
        schema = load_json(schema_path)
        jsonschema.validate(instance=data, schema=schema)
        return True
    except jsonschema.ValidationError as e:
        print(f"Schema validation error in {schema_path}: {e.message}")
        return False

def check_stamp_isolation(file_path, data):
    # recursive check for forbidden keys
    def check_recursive(node, path=""):
        if isinstance(node, dict):
            for k, v in node.items():
                if k.lower() in FORBIDDEN_KEYS:
                    raise ValueError(f"Forbidden key '{k}' found in {file_path} at {path}. Timestamps are only allowed in stamp.json.")
                check_recursive(v, path + "." + k if path else k)
        elif isinstance(node, list):
            for i, item in enumerate(node):
                check_recursive(item, f"{path}[{i}]")

    # Only apply to report and metrics files
    filename = os.path.basename(file_path)
    if "report" in filename or "metrics" in filename:
         if "stamp" not in filename:
             check_recursive(data)

def main():
    parser = argparse.ArgumentParser(description="Verify evidence artifacts")
    parser.add_argument("--index", default="evidence/index.json", help="Path to evidence index")
    parser.add_argument("--prefix", default="EVD-ENTR-2026-", help="Evidence ID prefix to validate (empty for all)")
    args = parser.parse_args()

    if not os.path.exists(args.index):
        print(f"Error: Index file not found at {args.index}")
        sys.exit(1)

    print(f"Validating {args.index}...")
    try:
        index_data = load_json(args.index)
        # Always validate the index schema itself
        if not validate_schema(index_data, INDEX_SCHEMA_PATH):
             print("Index schema validation failed.")
             # Continue to check items if possible, or exit?
             # Strict: exit.
             sys.exit(1)
    except Exception as e:
        print(f"Index validation failed: {e}")
        sys.exit(1)

    print("Index schema validation passed.")

    items = index_data.get("items", {})
    errors = []

    for evd_id, entry in items.items():
        # Filter by prefix
        if args.prefix and not evd_id.startswith(args.prefix):
            continue

        print(f"Verifying {evd_id}...")
        files = entry.get("files", []) or entry.get("artifacts", [])
        for rel_path in files:
            if not os.path.exists(rel_path):
                # Check if it is a template path from existing index
                if "templates" in rel_path:
                     continue
                errors.append(f"{evd_id}: File not found: {rel_path}")
                continue

            try:
                data = load_json(rel_path)

                # Stamp isolation check
                try:
                    check_stamp_isolation(rel_path, data)
                except ValueError as ve:
                    errors.append(f"{evd_id}: {ve}")
                    continue

                # Schema validation for specific types
                filename = os.path.basename(rel_path)
                schema_name = None
                if "report.json" in filename:
                    schema_name = "evidence.report.schema.json"
                elif "metrics.json" in filename:
                    schema_name = "evidence.metrics.schema.json"
                elif "stamp.json" in filename:
                    schema_name = "evidence.stamp.schema.json"

                if schema_name:
                    schema_path = os.path.join(SCHEMA_DIR, schema_name)
                    if not validate_schema(data, schema_path):
                        errors.append(f"{evd_id}: Schema validation failed for {rel_path}")

            except Exception as e:
                errors.append(f"{evd_id}: Error in {rel_path}: {e}")

    if errors:
        print("Verification Errors:")
        for err in errors:
            print(f" - {err}")
        sys.exit(1)

    print("All filtered evidence verified successfully.")

if __name__ == "__main__":
    main()
