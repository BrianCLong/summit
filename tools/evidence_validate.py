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
    parser.add_argument("--index", required=True, help="Path to evidence index.json")
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
    index_data = load_json(args.index)
    if index_data is None:
        sys.exit(1)

    success = True

    items = index_data.get("items", {})
    if isinstance(items, dict):
        for evidence_id, meta in items.items():
            artifacts = meta.get("artifacts", [])
            for artifact_path in artifacts:
                if not os.path.exists(artifact_path):
                    print(f"Missing artifact: {artifact_path}")
                    success = False
                    continue
                data = load_json(artifact_path)
                if data is None:
                    success = False
                    continue
                filename = os.path.basename(artifact_path)
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
                    if not validate_schema(data, schema, artifact_path):
                        success = False
                if not check_timestamps(data, artifact_path, allow_timestamps):
                    success = False
    elif isinstance(items, list):
        for item in items:
            evidence_id = item.get("id")
            path = item.get("path")
            if not path: continue
            if os.path.isdir(path):
                for filename, schema, allow_timestamps in [
                    ("report.json", report_schema, False),
                    ("metrics.json", metrics_schema, False),
                    ("stamp.json", stamp_schema, True)
                ]:
                    filepath = os.path.join(path, filename)
                    if not os.path.exists(filepath): continue
                    data = load_json(filepath)
                    if data is None:
                        success = False
                        continue
                    if not validate_schema(data, schema, filepath):
                        success = False
                    if not check_timestamps(data, filepath, allow_timestamps):
                        success = False

    if not success:
        sys.exit(1)
    print("Validation successful.")

if __name__ == "__main__":
    main()
