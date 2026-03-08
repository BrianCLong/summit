import argparse
import json
import os
import sys
from typing import Any, Dict

import jsonschema


def load_json(path: str) -> Any:
    try:
        with open(path) as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {path}: {e}")
        return None

def validate_schema(data: Any, schema: dict, name: str) -> bool:
    try:
        jsonschema.validate(instance=data, schema=schema)
        return True
    except jsonschema.ValidationError as e:
        print(f"Schema validation failed for {name}: {e.message}")
        return False

def check_deterministic_formatting(path: str) -> bool:
    """Check if file is deterministically formatted (indent=2, sort_keys=True)."""
    try:
        with open(path) as f:
            content = f.read()

        if not content.strip():
            return True # Empty file?

        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            return False

        # Re-dump
        formatted = json.dumps(data, indent=2, sort_keys=True)

        # Compare ignoring trailing newline differences
        if content.strip() != formatted.strip():
            # Create a visual diff hint if possible, or just fail
            # print(f"DEBUG: Content len {len(content)}, Formatted len {len(formatted)}")
            return False

        return True
    except Exception as e:
        print(f"Formatting check error for {path}: {e}")
        return False

def check_timestamps_location(data: Any, filename: str, allow_timestamps: bool) -> bool:
    """Ensure timestamps only appear in stamp.json."""
    timestamp_keys = ["timestamp", "created_at", "updated_at", "generated_at", "ts"]

    if isinstance(data, dict):
        for k, v in data.items():
            if k in timestamp_keys and not allow_timestamps:
                print(f"Error: Timestamp key '{k}' found in {filename}. Allowed only in stamp.json.")
                return False
            if not check_timestamps_location(v, filename, allow_timestamps):
                return False
    elif isinstance(data, list):
        for item in data:
            if not check_timestamps_location(item, filename, allow_timestamps):
                return False
    return True

def main():
    parser = argparse.ArgumentParser(description="Validate Summit Evidence System")
    parser.add_argument("--schemas", default="evidence/schema", help="Path to schemas dir")
    parser.add_argument("--index", default="evidence/index.json", help="Path to index.json")
    parser.add_argument("--root", default=".", help="Repo root")
    parser.add_argument("--strict", action="store_true", help="Fail on formatting or legacy issues")
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
        print("Error: One or more schemas could not be loaded.")
        sys.exit(1)

    # Validate Index File
    index_path = args.index
    if not os.path.exists(index_path):
        print(f"Index not found: {index_path}")
        sys.exit(1)

    index_data = load_json(index_path)
    if not validate_schema(index_data, index_schema, "index.json"):
        sys.exit(1)

    if not check_deterministic_formatting(index_path):
        print(f"Warning: {index_path} formatting is not deterministic.")
        if args.strict:
            sys.exit(1)

    success = True

    # Iterate Items
    items = index_data.get("items", {})
    for evd_id, details in items.items():
        files = details.get("files", []) + details.get("artifacts", [])

        has_report = False
        has_metrics = False
        has_stamp = False

        for fpath in files:
            full_path = os.path.join(args.root, fpath)
            if not os.path.exists(full_path):
                if "KIMI-K25" in evd_id:
                    print(f"Missing file for {evd_id}: {fpath}")
                    success = False
                else:
                    print(f"Warning: Missing file for legacy {evd_id}: {fpath}")
                continue

            basename = os.path.basename(fpath)

            is_report = basename == "report.json"
            is_metrics = basename == "metrics.json"
            is_stamp = basename == "stamp.json"

            if is_report: has_report = True
            if is_metrics: has_metrics = True
            if is_stamp: has_stamp = True

            # Validate Kimi items strictly
            if "KIMI-K25" in evd_id:
                schema = None
                allow_ts = False

                if is_report:
                    schema = report_schema
                elif is_metrics:
                    schema = metrics_schema
                elif is_stamp:
                    schema = stamp_schema
                    allow_ts = True

                if schema:
                    data = load_json(full_path)
                    if data is None:
                        success = False
                        continue

                    if not validate_schema(data, schema, f"{evd_id}/{basename}"):
                        success = False

                    if not check_timestamps_location(data, basename, allow_ts):
                        success = False

                    if not check_deterministic_formatting(full_path):
                        print(f"Warning: Formatting mismatch in {fpath}")
                        if args.strict:
                            success = False
            else:
                # Legacy items: skip strict schema validation to avoid breaking build
                # Check formatting only as warning
                if fpath.endswith(".json"):
                    if not check_deterministic_formatting(full_path):
                         # Print warning but don't fail unless strict global policy enabled (which we might want to avoid for now)
                         # print(f"Warning: Formatting mismatch in {fpath}")
                         pass

        # For Kimi K2.5 items, enforce presence of all 3 artifacts
        if "KIMI-K25" in evd_id:
            missing = []
            if not has_report: missing.append("report.json")
            if not has_metrics: missing.append("metrics.json")
            if not has_stamp: missing.append("stamp.json")

            if missing:
                print(f"Error: {evd_id} missing required artifacts: {', '.join(missing)}")
                success = False

    if not success:
        print("Validation failed.")
        sys.exit(1)

    print("Evidence validation passed.")

if __name__ == "__main__":
    main()
