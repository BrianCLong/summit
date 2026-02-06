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

    # Prepare Items
    items_section = index_data.get("items", {})
    items_to_validate = []

    if isinstance(items_section, dict):
        for eid, details in items_section.items():
            item = details.copy()
            item["id"] = eid
            items_to_validate.append(item)
    elif isinstance(items_section, list):
        items_to_validate = items_section

    # Validate Items
    for item in items_to_validate:
        evidence_id = item.get("id")
        files = item.get("files", [])
        path = item.get("path")

        artifacts_to_check = []

        if files:
            for filepath in files:
                # Assuming filepath is relative to repo root if it starts with evidence/
                # or relative to args.evidence if it's just a filename?
                # The example index.json shows "evidence/report.json".
                # args.evidence is usually "evidence".
                # If filepath starts with "evidence/", likely it's from repo root.

                # Check file existence
                if not os.path.exists(filepath):
                    print(f"Warning: File not found for evidence {evidence_id}: {filepath}")
                    # Try relative to evidence dir if it fails
                    rel_path = os.path.join(args.evidence, filepath)
                    if os.path.exists(rel_path):
                        filepath = rel_path
                    else:
                        print(f"Error: Missing artifact {filepath}")
                        success = False
                        continue

                filename = os.path.basename(filepath)
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
                    artifacts_to_check.append((filepath, schema, allow_timestamps))

        elif path:
            full_path = path
            if not os.path.exists(full_path):
                print(f"Warning: Path not found for evidence {evidence_id}: {full_path}")
                continue

            if os.path.isdir(full_path):
                artifacts_to_check = [
                    (os.path.join(full_path, "report.json"), report_schema, False),
                    (os.path.join(full_path, "metrics.json"), metrics_schema, False),
                    (os.path.join(full_path, "stamp.json"), stamp_schema, True)
                ]
            else:
                if "LIMY-AGENTICWEB" in evidence_id:
                     print(f"Error: Agentic Web evidence {evidence_id} points to a file, expected directory.")
                     success = False

        for filepath, schema, allow_timestamps in artifacts_to_check:
            if not os.path.exists(filepath):
                 # Should have been caught above, but double check
                 print(f"Missing artifact {filepath}")
                 success = False
                 continue

            data = load_json(filepath)
            if data is None:
                success = False
                continue

            if not validate_schema(data, schema, f"{evidence_id}/{os.path.basename(filepath)}"):
                success = False

            if not check_timestamps(data, filepath, allow_timestamps):
                success = False

    if not success:
        sys.exit(1)

    print("Validation successful.")

if __name__ == "__main__":
    main()
