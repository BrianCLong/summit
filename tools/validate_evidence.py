#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Any

DEFAULT_ROOT = Path.cwd()
SCHEMA_ROOT_ENV = "EVIDENCE_SCHEMA_ROOT"


def resolve_schema_dir() -> Path:
    env_root = Path(os.environ[SCHEMA_ROOT_ENV]) if SCHEMA_ROOT_ENV in os.environ else None
    if env_root:
        return env_root / "schemas" / "evidence"
    return DEFAULT_ROOT / "schemas" / "evidence"


def resolve_index_path() -> Path:
    return DEFAULT_ROOT / "evidence" / "index.json"

TIMESTAMP_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}")


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(2)


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001 - surfaced with context
        fail(f"Failed to read {path}: {exc}")


def build_schema_store(schema_dir: Path) -> dict[str, Any]:
    store: dict[str, Any] = {}
    for schema_path in schema_dir.glob("*.schema.json"):
        schema = load_json(schema_path)
        store[schema_path.name] = schema
    return store


def validate_schema(instance: Any, schema: dict[str, Any], context: str) -> None:
    try:
        import jsonschema  # type: ignore[import-not-found]
    except ImportError as exc:
        fail(f"jsonschema dependency missing: {exc}")

    try:
        jsonschema.validate(instance=instance, schema=schema)
    except jsonschema.ValidationError as exc:
        fail(f"Schema validation failed for {context}: {exc.message}")
    except jsonschema.SchemaError as exc:
        fail(f"Invalid schema for {context}: {exc.message}")


def scan_for_timestamps(data: Any, path: str) -> None:
    if isinstance(data, dict):
        for key, value in data.items():
            scan_for_timestamps(value, f"{path}.{key}" if path else key)
    elif isinstance(data, list):
        for index, value in enumerate(data):
            scan_for_timestamps(value, f"{path}[{index}]")
    elif isinstance(data, str):
        if TIMESTAMP_REGEX.match(data):
            fail(
                "Timestamp detected outside stamp.json at "
                f"{path}: {data}"
            )


def assert_file(path: Path, context: str) -> None:
    if not path.exists():
        fail(f"Missing {context}: {path}")


def validate_evidence_entries(index: dict[str, Any], schema_dir: Path) -> None:
    evidence = index.get("evidence")
    if not isinstance(evidence, dict) or not evidence:
        fail("Evidence index must include at least one evidence entry")

    schema_store = build_schema_store(schema_dir)
    report_schema = schema_store.get("report.schema.json")
    metrics_schema = schema_store.get("metrics.schema.json")
    stamp_schema = schema_store.get("stamp.schema.json")

    if report_schema is None or metrics_schema is None or stamp_schema is None:
        missing = [
            name
            for name, schema in {
                "report.schema.json": report_schema,
                "metrics.schema.json": metrics_schema,
                "stamp.schema.json": stamp_schema,
            }.items()
            if schema is None
        ]
        fail(f"Missing evidence schemas: {', '.join(missing)}")

    for evidence_id, files in evidence.items():
        if not isinstance(files, dict):
            fail(f"Evidence entry for {evidence_id} must be an object")

        for required_key in ("report", "metrics", "stamp"):
            if required_key not in files:
                fail(f"Evidence entry {evidence_id} missing {required_key}")

        report_path = DEFAULT_ROOT / files["report"]
        metrics_path = DEFAULT_ROOT / files["metrics"]
        stamp_path = DEFAULT_ROOT / files["stamp"]

        assert_file(report_path, f"report for {evidence_id}")
        assert_file(metrics_path, f"metrics for {evidence_id}")
        assert_file(stamp_path, f"stamp for {evidence_id}")

        report = load_json(report_path)
        metrics = load_json(metrics_path)
        stamp = load_json(stamp_path)

        validate_schema(report, report_schema, f"{evidence_id} report")
        validate_schema(metrics, metrics_schema, f"{evidence_id} metrics")
        validate_schema(stamp, stamp_schema, f"{evidence_id} stamp")

        scan_for_timestamps(report, str(report_path))
        scan_for_timestamps(metrics, str(metrics_path))


def main() -> int:
    index_path = resolve_index_path()
    if not index_path.exists():
        fail("missing evidence/index.json")

    index = load_json(index_path)
    schema_dir = resolve_schema_dir()
    index_schema_path = schema_dir / "index.schema.json"
    assert_file(index_schema_path, "evidence index schema")
    index_schema = load_json(index_schema_path)

    validate_schema(index, index_schema, "evidence index")
    validate_evidence_entries(index, schema_dir)

    print("Evidence validation succeeded.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
