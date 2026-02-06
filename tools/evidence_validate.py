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

    # Normalize items to list of objects
    items_raw = index_data.get("items", [])
    items = []
    if isinstance(items_raw, dict):
        for eid, edata in items_raw.items():
            item = edata.copy()
            item["id"] = eid
            items.append(item)
    else:
        items = items_raw

    # Validate Items
    for item in items:
        evidence_id = item.get("id")
        # Support both 'path' and 'files'
        path = item.get("path")
        files = item.get("files", item.get("artifacts", []))

        if not path and not files:
             print(f"Warning: No path or files for evidence {evidence_id}")
             continue

        if path:
            if not os.path.exists(path):
                print(f"Warning: Path not found for evidence {evidence_id}: {path}")
                continue

            if os.path.isdir(path):
                artifacts_to_check = [
                    ("report.json", report_schema, False),
                    ("metrics.json", metrics_schema, False),
                    ("stamp.json", stamp_schema, True)
                ]
                for filename, schema, allow_timestamps in artifacts_to_check:
                    filepath = os.path.join(path, filename)
                    if not os.path.exists(filepath):
                         print(f"Missing artifact {filename} in {path}")
                         success = False
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
                # File-based evidence - skip schema validation for now as it might be any format
                pass

        if files:
            for fpath in files:
                if not os.path.exists(fpath):
                    print(f"Warning: File not found for evidence {evidence_id}: {fpath}")
                    success = False
                    continue

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
                    if data is None:
                        success = False
                        continue
                    if not validate_schema(data, schema, f"{evidence_id}/{fname}"):
                        success = False
                    if not check_timestamps(data, fpath, allow_timestamps):
                        success = False

    if not success:
        sys.exit(1)

    print("Validation successful.")

if __name__ == "__main__":
    main()
