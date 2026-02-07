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
    if isinstance(items, dict):
        item_list = []
        for eid, data in items.items():
            item = data.copy()
            item["id"] = eid
            # In the dict version, the paths might be in 'files' or 'artifacts'
            # The script expects 'path' for the directory validation below.
            # If 'files' is present and is a list, maybe the first one?
            # Or if it's a directory-based evidence system.
            if "path" not in item:
                # Guess path from artifacts or files if they look like they are in a subdir
                files = item.get("files") or item.get("artifacts")
                if files and len(files) > 0:
                    # common prefix or just the directory of the first file
                    item["path"] = os.path.dirname(files[0])
            item_list.append(item)
    else:
        item_list = items

    for item in item_list:
        evidence_id = item.get("id")
        path = item.get("path")
        if not path:
            continue

        # If path is relative, make it absolute relative to repo root (or args.evidence parent)
        # Assuming args.evidence points to 'evidence/' dir.
        # But index.json paths seem to be relative to repo root e.g. "evidence/report.json"

        # If path is a directory, look for standard artifacts
        # If path is a file, strictly it doesn't match the new standard but let's see.

        full_path = path
        if not os.path.exists(full_path):
            print(f"Warning: Path not found for evidence {evidence_id}: {full_path}")
            # Non-fatal for now unless strict
            continue

        artifacts_to_check = []
        if os.path.isdir(full_path):
            artifacts_to_check = [
                ("report.json", report_schema, False),
                ("metrics.json", metrics_schema, False),
                ("stamp.json", stamp_schema, True)
            ]
            base_dir = full_path
        else:
            # It's a file. check what it is based on name?
            # Existing entries point to 'evidence/report.json'.
            # We can skip validation for legacy or try to guess.
            # For this plan, we care about the new IDs which are directories.
            if "LIMY-AGENTICWEB" in evidence_id:
                 print(f"Error: Agentic Web evidence {evidence_id} points to a file, expected directory.")
                 success = False
            continue

        for filename, schema, allow_timestamps in artifacts_to_check:
            filepath = os.path.join(base_dir, filename)
            if not os.path.exists(filepath):
                 # For legacy or specific items, some artifacts might be missing.
                 # We only require them for certain evidence types.
                 if "LIMY-AGENTICWEB" in evidence_id:
                     print(f"Error: Missing required artifact {filename} in {base_dir}")
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

    if not success:
        sys.exit(1)

    print("Validation successful.")

if __name__ == "__main__":
    main()
