#!/usr/bin/env python3
import json
import os
import sys
import re
from typing import Any, Dict, List, Union

# Try to import jsonschema, else fail gracefully (or mock if not critical, but gate should fail)
try:
    import jsonschema
except ImportError:
    print("Error: jsonschema module not found. Please install it.")
    sys.exit(1)

def load_json(path: str) -> Any:
    with open(path, "r") as f:
        return json.load(f)

def check_determinism(data: Any, path: str) -> List[str]:
    """
    Recursively check for timestamp-like keys or values in data.
    Allowed only in stamp.json.
    """
    errors = []
    timestamp_keys = ["created_at", "timestamp", "date", "time", "generated_at"]
    # ISO8601 regex approximation
    iso8601_pattern = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}")

    if isinstance(data, dict):
        for k, v in data.items():
            if any(tk in k.lower() for tk in timestamp_keys):
                errors.append(f"Forbidden timestamp key '{k}' found in {path}")

            if isinstance(v, str) and iso8601_pattern.match(v):
                errors.append(f"Forbidden timestamp value '{v}' found in {path} (key: {k})")

            errors.extend(check_determinism(v, path))
    elif isinstance(data, list):
        for item in data:
            errors.extend(check_determinism(item, path))

    return errors

def validate_artifact(path: str, schema_path: str, is_stamp: bool) -> List[str]:
    errors = []
    try:
        data = load_json(path)
        schema = load_json(schema_path)

        # Schema validation
        try:
            jsonschema.validate(instance=data, schema=schema)
        except jsonschema.ValidationError as e:
            errors.append(f"Schema validation failed for {path}: {e.message}")

        # Determinism check (skip for stamp)
        if not is_stamp:
            det_errors = check_determinism(data, path)
            errors.extend(det_errors)

    except FileNotFoundError:
        errors.append(f"Artifact not found: {path}")
    except json.JSONDecodeError:
        errors.append(f"Invalid JSON in {path}")

    return errors

def verify_evidence(repo_root: str) -> List[str]:
    evidence_index_path = os.path.join(repo_root, "evidence", "index.json")
    report_schema_path = os.path.join(repo_root, "intel", "schema", "evidence_report.schema.json")
    metrics_schema_path = os.path.join(repo_root, "intel", "schema", "evidence_metrics.schema.json")
    stamp_schema_path = os.path.join(repo_root, "intel", "schema", "evidence_stamp.schema.json")

    if not os.path.exists(evidence_index_path):
        return [f"Error: {evidence_index_path} not found."]

    try:
        index_data = load_json(evidence_index_path)
    except json.JSONDecodeError:
        return [f"Error: Invalid JSON in {evidence_index_path}"]

    items = index_data.get("items", {})
    all_errors = []

    for evd_id, entry in items.items():
        # Check for files or artifacts
        files = entry.get("files") or entry.get("artifacts")
        if not files:
            if evd_id.startswith("EVD-INTELBRIEF-"):
                all_errors.append(f"{evd_id}: Missing 'files' or 'artifacts' list.")
            continue

        if not isinstance(files, list):
             if evd_id.startswith("EVD-INTELBRIEF-"):
                 all_errors.append(f"{evd_id}: 'files'/'artifacts' must be a list.")
             continue

        # Check for report, metrics, stamp presence and content
        report_path = None
        metrics_path = None
        stamp_path = None

        for f in files:
            if "report.json" in f:
                report_path = os.path.join(repo_root, f)
            elif "metrics.json" in f:
                metrics_path = os.path.join(repo_root, f)
            elif "stamp.json" in f:
                stamp_path = os.path.join(repo_root, f)

        # Only validate schemas for INTELBRIEF items for now
        if evd_id.startswith("EVD-INTELBRIEF-"):
            if not report_path:
                all_errors.append(f"{evd_id}: Missing report.json")
            else:
                all_errors.extend(validate_artifact(report_path, report_schema_path, is_stamp=False))

            if not metrics_path:
                all_errors.append(f"{evd_id}: Missing metrics.json")
            else:
                all_errors.extend(validate_artifact(metrics_path, metrics_schema_path, is_stamp=False))

            if not stamp_path:
                all_errors.append(f"{evd_id}: Missing stamp.json")
            else:
                all_errors.extend(validate_artifact(stamp_path, stamp_schema_path, is_stamp=True))

    return all_errors

def main():
    print("Starting Evidence Verification...")
    repo_root = os.getcwd()
    errors = verify_evidence(repo_root)

    if errors:
        print("Evidence Verification FAILED:")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("Evidence Verification PASSED.")

if __name__ == "__main__":
    main()
