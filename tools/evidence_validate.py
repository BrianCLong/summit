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

    # Support both list and dict structures
    if isinstance(items, list):
        item_list = items
    elif isinstance(items, dict):
        # Convert map to list of objects with ID
        item_list = []
        for eid, content in items.items():
            if isinstance(content, dict):
                item_list.append({"id": eid, **content})
            else:
                item_list.append({"id": eid, "path": content})
    else:
        item_list = []

    for item in item_list:
        evidence_id = item.get("id")
        # Support both 'path' (legacy) and 'files' (new)
        path = item.get("path")
        files = item.get("files", [])

        # If it has files, we'll check each.
        # If it has path, we check standard artifacts in that path.

        if files:
            for f in files:
                if not os.path.exists(f):
                    print(f"Warning: File not found for evidence {evidence_id}: {f}")
                    continue

                # Try to validate based on name
                data = load_json(f)
                if data is None:
                    success = False
                    continue

                fname = os.path.basename(f)
                schema = None
                allow_timestamps = False
                if fname == "report.json":
                    schema = report_schema
                elif fname == "metrics.json":
                    schema = metrics_schema
                elif fname == "stamp.json":
                    schema = stamp_schema
                    allow_timestamps = True

                if schema:
                    if not validate_schema(data, schema, f"{evidence_id}/{fname}"):
                        success = False
                    if not check_timestamps(data, f, allow_timestamps):
                        success = False
        elif path:
            full_path = path
            if not os.path.exists(full_path):
                print(f"Warning: Path not found for evidence {evidence_id}: {full_path}")
                continue

            if os.path.isdir(full_path):
                artifacts_to_check = [
                    ("report.json", report_schema, False),
                    ("metrics.json", metrics_schema, False),
                    ("stamp.json", stamp_schema, True)
                ]
                base_dir = full_path
                for filename, schema, allow_timestamps in artifacts_to_check:
                    filepath = os.path.join(base_dir, filename)
                    if not os.path.exists(filepath):
                        continue

                    data = load_json(filepath)
                    if data is None:
                        success = False
                        continue

                    if not validate_schema(data, schema, f"{evidence_id}/{filename}"):
                        success = False

                    if not check_timestamps(data, filepath, allow_timestamps):
                        success = False
            else:
                # It's a file.
                pass

    if not success:
        sys.exit(1)

    print("Validation successful.")

if __name__ == "__main__":
    main()
