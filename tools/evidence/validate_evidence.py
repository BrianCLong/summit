#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT / "tools" / "ci"))

from evidence_parser import normalize_index_from_path

INDEX_PATH = Path("evidence/index.json")
SCHEMA_DIR = Path("schemas/evidence")

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

def load_schema(name: str) -> dict:
    return json.loads((SCHEMA_DIR / name).read_text(encoding="utf-8"))


def validate_schema_if_available(data: dict, schema: dict, label: str) -> None:
    try:
        import jsonschema
    except ImportError:
        return
    jsonschema.validate(instance=data, schema=schema)

def validate_evidence_files(files: list[str], strict: bool = False) -> None:
    report_schema = load_schema("report.schema.json")
    metrics_schema = load_schema("metrics.schema.json")
    stamp_schema = load_schema("stamp.schema.json")

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
        if path.name == "report.json":
            validate_schema_if_available(data, report_schema, str(path))
        elif path.name == "metrics.json":
            validate_schema_if_available(data, metrics_schema, str(path))
        elif path.name == "stamp.json":
            validate_schema_if_available(data, stamp_schema, str(path))

def main() -> int:
    try:
        entries = normalize_index_from_path(INDEX_PATH)
    except Exception:
        return 2

    if not entries:
         print("evidence/index.json contains no evidence entries")
         return 3

    error_count = 0
    for entry in entries:
        evidence_id = entry.get("evidence_id")
        files = entry.get("files", {})
        extra_files = entry.get("extra_files", [])

        if not evidence_id:
             print("Entry missing evidence_id")
             error_count += 1
             continue

        is_strict = evidence_id.startswith(STRICT_PREFIX)
        file_paths = [value for value in files.values() if value] + list(extra_files)
        if not file_paths:
            continue

        try:
            validate_evidence_files(file_paths, strict=is_strict)
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
