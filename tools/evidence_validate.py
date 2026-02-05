import argparse
import json
import os
import sys
from typing import Any, Dict, List

import jsonschema


def load_json(path: str) -> Any:
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: File not found: {path}")
        return None
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {path}: {e}")
        return None

def validate_schema(data: Any, schema: dict[str, Any], context: str) -> bool:
    try:
        jsonschema.validate(instance=data, schema=schema)
        return True
    except jsonschema.ValidationError as e:
        print(f"Validation failed for {context}: {e.message}")
        return False

def check_timestamps(data: Any, path: str, allowed: bool) -> bool:
    if isinstance(data, dict):
        for key, value in data.items():
            if key in ["timestamp", "created_at", "updated_at", "ts", "generated_at"]:
                if not allowed:
                    print(f"Error: Timestamp field '{key}' found in {path}. Timestamps are only allowed in stamp.json.")
                    return False
            if not check_timestamps(value, path, allowed):
                return False
    elif isinstance(data, list):
        for item in data:
            if not check_timestamps(item, path, allowed):
                return False
    return True

def main():
    parser = argparse.ArgumentParser(description="Validate evidence artifacts against schemas.")
    parser.add_argument("--schemas", required=True, help="Directory containing schemas")
    parser.add_argument("--evidence", required=True, help="Root directory for evidence")
    args = parser.parse_args()

    # Load Schemas
    try:
        index_schema = load_json(os.path.join(args.schemas, "index.schema.json"))
        report_schema = load_json(os.path.join(args.schemas, "report.schema.json"))
        metrics_schema = load_json(os.path.join(args.schemas, "metrics.schema.json"))
        stamp_schema = load_json(os.path.join(args.schemas, "stamp.schema.json"))
    except Exception as e:
        print(f"Failed to load schemas: {e}")
        sys.exit(1)

    if not all([index_schema, report_schema, metrics_schema, stamp_schema]):
        sys.exit(1)

    # Validate Index
    index_path = os.path.join(args.evidence, "index.json")
    index_data = load_json(index_path)
    if index_data is None:
        sys.exit(1)

    if not validate_schema(index_data, index_schema, "index.json"):
        sys.exit(1)

    success = True

    # Validate Items
    items = index_data.get("items", {})
    if isinstance(items, list):
        # Handle legacy list format if necessary, though schema suggests object
        print("Warning: 'items' is a list, expected dictionary. Skipping item validation.")
        pass
    elif isinstance(items, dict):
        for evidence_id, item_data in items.items():
            # Support both 'files' and 'artifacts' keys based on current index.json content
            files = item_data.get("files") or item_data.get("artifacts") or []

            if not files:
                print(f"Warning: No files/artifacts found for {evidence_id}")
                continue

            for file_path in files:
                # Normalize path: remove 'evidence/' prefix if present to avoid doubling up
                # assuming args.evidence is the root (e.g. 'evidence')
                # and file_path in index is like 'evidence/report.json'

                # Check if file_path starts with the evidence dir name
                # strict check: os.path.join(os.getcwd(), file_path) should exist

                full_path = file_path
                if not os.path.exists(full_path):
                     print(f"Warning: Artifact not found: {full_path}")
                     continue

                filename = os.path.basename(full_path)

                # Determine schema based on filename
                schema = None
                allow_timestamps = False

                if filename == "report.json":
                    schema = report_schema
                elif filename == "metrics.json":
                    schema = metrics_schema
                elif filename == "stamp.json":
                    schema = stamp_schema
                    allow_timestamps = True

                if schema:
                    data = load_json(full_path)
                    if data is not None:
                        if not validate_schema(data, schema, f"{evidence_id}/{filename}"):
                            success = False
                        if not check_timestamps(data, full_path, allow_timestamps):
                            success = False

    if not success:
        sys.exit(1)

    print("Validation successful.")

if __name__ == "__main__":
    main()
