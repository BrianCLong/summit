import argparse
import json
import os
import sys
from typing import Any

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
        # Handle legacy list format if necessary, though schema says object
        print("Warning: 'items' is a list, expected object/dict per schema. Skipping item validation logic for list.")
        success = False
    else:
        for evidence_id, item_data in items.items():
            # Support both files and artifacts keys
            file_paths = item_data.get("files", []) + item_data.get("artifacts", [])

            if not file_paths:
                print(f"Warning: No files/artifacts listed for {evidence_id}")
                continue

            for rel_path in file_paths:
                # paths are relative to repo root usually.
                # Check if it exists relative to cwd or args.evidence?
                # Usually these scripts run from repo root.

                if not os.path.exists(rel_path):
                    # Try relative to evidence dir if not found
                    alt_path = os.path.join(args.evidence, rel_path)
                    if os.path.exists(alt_path):
                        full_path = alt_path
                    else:
                        # Allow templates skipping?
                        if "templates" in rel_path:
                            continue
                        print(f"Error: File not found: {rel_path} (for {evidence_id})")
                        success = False
                        continue
                else:
                    full_path = rel_path

                data = load_json(full_path)
                if data is None:
                    success = False
                    continue

                # Determine schema based on filename
                filename = os.path.basename(full_path)
                schema_to_use = None
                allow_timestamps = False

                if "report.json" in filename:
                    schema_to_use = report_schema
                elif "metrics.json" in filename:
                    schema_to_use = metrics_schema
                elif "stamp.json" in filename:
                    schema_to_use = stamp_schema
                    allow_timestamps = True

                if schema_to_use:
                    if not validate_schema(data, schema_to_use, f"{evidence_id}/{filename}"):
                        success = False

                if not check_timestamps(data, full_path, allow_timestamps):
                    success = False

    if not success:
        sys.exit(1)

    print("Validation successful.")

if __name__ == "__main__":
    main()
