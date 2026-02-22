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
    items_data = index_data.get("items", {})
    if isinstance(items_data, list):
        item_iter = [(str(i), item) for i, item in enumerate(items_data)]
    else:
        item_iter = items_data.items()

    for eid, item in item_iter:
        evidence_id = eid
        if isinstance(item, dict) and item.get("evidence_id"):
            evidence_id = item.get("evidence_id")

        file_list = []
        if isinstance(item, dict):
            file_list = item.get("files") or item.get("artifacts") or []

        # If path is present (legacy or directory-based), handle it
        path = item.get("path") if isinstance(item, dict) else None
        if path:
            if os.path.isdir(path):
                for f in ["report.json", "metrics.json", "stamp.json"]:
                    file_list.append(os.path.join(path, f))
            else:
                file_list.append(path)

        for fpath in file_list:
            if not os.path.exists(fpath):
                print(f"Warning: File not found for evidence {evidence_id}: {fpath}")
                continue

            # Determine schema based on filename
            fname = os.path.basename(fpath)
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
                data = load_json(fpath)
                if data:
                    if not validate_schema(data, schema, f"{evidence_id}/{fname}"):
                        success = False
                    if not check_timestamps(data, fpath, allow_timestamps):
                        success = False

    if not success:
        sys.exit(1)

    print("Validation successful.")

if __name__ == "__main__":
    main()
