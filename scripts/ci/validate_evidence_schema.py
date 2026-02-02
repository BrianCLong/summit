#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator

DEFAULT_SCHEMA_DIR = Path("schemas/evidence")
DEFAULT_INDEX_PATH = Path("evidence/index.json")

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT / "tools" / "ci"))

from evidence_parser import normalize_index_from_path

TIMESTAMP_KEYS = {
    "created_at",
    "generated_at",
    "timestamp",
    "ts",
    "createdAt",
    "generatedAt",
}


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_json(path: Path) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"Missing file: {path}")
    except json.JSONDecodeError as exc:
        fail(f"Invalid JSON in {path}: {exc}")
    return {}


def load_schema(schema_dir: Path, name: str) -> dict:
    schema_path = schema_dir / name
    schema = load_json(schema_path)
    if not isinstance(schema, dict):
        fail(f"Schema must be an object: {schema_path}")
    return schema


def validate_schema(instance: object, schema: dict, label: str) -> None:
    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(instance), key=lambda e: e.path)
    if errors:
        details = "; ".join([error.message for error in errors])
        fail(f"Schema validation failed for {label}: {details}")


def find_timestamp_keys(value: object, path: str) -> list[str]:
    hits: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            next_path = f"{path}.{key}" if path else key
            if key in TIMESTAMP_KEYS:
                hits.append(next_path)
            hits.extend(find_timestamp_keys(child, next_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            next_path = f"{path}[{index}]"
            hits.extend(find_timestamp_keys(child, next_path))
    return hits


def ensure_no_timestamps_outside_stamp(path: Path, payload: object) -> None:
    if path.name == "stamp.json":
        return
    hits = find_timestamp_keys(payload, "")
    if hits:
        joined = ", ".join(hits)
        fail(f"Timestamps must live in stamp.json only: {path} has {joined}")


def validate_evidence_entry(schema_dir: Path, evidence_id: str, files: dict) -> None:
    missing = [key for key, value in files.items() if not value]
    if missing and len(missing) != 3:
        fail(f"{evidence_id} missing file mapping for {sorted(missing)}")
    if missing and len(missing) == 3:
        return

    report_schema = load_schema(schema_dir, "report.schema.json")
    metrics_schema = load_schema(schema_dir, "metrics.schema.json")
    stamp_schema = load_schema(schema_dir, "stamp.schema.json")

    for key, rel_path in files.items():
        if not rel_path:
            continue
        path = Path(rel_path)
        if not path.exists():
            fail(f"Missing evidence file: {rel_path}")
        payload = load_json(path)
        ensure_no_timestamps_outside_stamp(path, payload)

        if key == "report":
            validate_schema(payload, report_schema, rel_path)
        elif key == "metrics":
            validate_schema(payload, metrics_schema, rel_path)
        elif key == "stamp":
            validate_schema(payload, stamp_schema, rel_path)


def run_cli(args: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Validate evidence bundle schemas.")
    parser.add_argument(
        "--schema-dir",
        type=Path,
        default=DEFAULT_SCHEMA_DIR,
        help="Path to evidence schemas directory.",
    )
    parser.add_argument(
        "--index-path",
        type=Path,
        default=DEFAULT_INDEX_PATH,
        help="Path to evidence/index.json.",
    )
    parsed = parser.parse_args(args)

    index = load_json(parsed.index_path)
    index_schema = load_schema(parsed.schema_dir, "index.schema.json")
    validate_schema(index, index_schema, str(parsed.index_path))

    if not isinstance(index, dict):
        fail("evidence/index.json must be an object")

    entries = normalize_index_from_path(parsed.index_path)
    if not entries:
        fail("evidence/index.json contains no evidence entries")

    for entry in entries:
        evidence_id = entry.get("evidence_id") or "<unknown>"
        validate_evidence_entry(parsed.schema_dir, evidence_id, entry.get("files", {}))

    print("Evidence schema validation passed")
    return 0


def main() -> int:
    return run_cli(sys.argv[1:])


if __name__ == "__main__":
    raise SystemExit(main())
