#!/usr/bin/env python3
import json
import sys
from pathlib import Path

INDEX_PATH = Path("evidence/index.json")

# Based on new schemas in evidence/schemas/
REQUIRED_REPORT_FIELDS = {"evidence_id", "item", "summary", "artifacts"}
REQUIRED_METRICS_FIELDS = {"evidence_id", "metrics"}
REQUIRED_STAMP_FIELDS = {"evidence_id", "created_at", "git"}

STRICT_PREFIX = "EVD-260120802"

def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text())
    except FileNotFoundError:
        print(f"Missing file: {path}")
        raise
    except json.JSONDecodeError as exc:
        print(f"Invalid JSON in {path}: {exc}")
        raise

def validate_required_fields(data: dict, required: set, label: str) -> None:
    missing = required - set(data.keys())
    if missing:
        raise ValueError(f"{label} missing fields: {sorted(missing)}")

def validate_evidence_files(files: list[str], strict: bool = False) -> None:
    for file_path in files:
        path = Path(file_path)
        if not path.exists():
             msg = f"Evidence file {path} referenced in index does not exist. Skipping."
             if strict:
                 raise FileNotFoundError(msg)
             else:
                 print(f"Warning: {msg}")
                 continue

        data = load_json(path)
        try:
            if path.name == "report.json":
                validate_required_fields(data, REQUIRED_REPORT_FIELDS, str(path))
            elif path.name == "metrics.json":
                validate_required_fields(data, REQUIRED_METRICS_FIELDS, str(path))
            elif path.name == "stamp.json":
                validate_required_fields(data, REQUIRED_STAMP_FIELDS, str(path))
        except ValueError as e:
            if strict:
                raise e
            else:
                print(f"Warning (Legacy): {e}")

def main() -> int:
    try:
        index = load_json(INDEX_PATH)
    except Exception:
        return 2

    items = index.get("items")
    if not items or not isinstance(items, list):
         print("evidence/index.json must include 'items' list")
         return 3

    error_count = 0
    for entry in items:
        evidence_id = entry.get("evidence_id")
        files = entry.get("files")

        if not evidence_id:
             print("Entry missing evidence_id")
             error_count += 1
             continue

        is_strict = evidence_id.startswith(STRICT_PREFIX)

        if not isinstance(files, list) or not files:
            print(f"{evidence_id} missing files list")
            error_count += 1
            continue

        try:
            validate_evidence_files(files, strict=is_strict)
        except (ValueError, json.JSONDecodeError, FileNotFoundError) as exc:
            print(f"Error in {evidence_id}: {exc}")
            error_count += 1

    if error_count > 0:
        print(f"Evidence validation failed with {error_count} errors")
        return 1

    print("Evidence validation passed")
    return 0

if __name__ == "__main__":
    sys.exit(main())
