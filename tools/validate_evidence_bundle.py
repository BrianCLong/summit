#!/usr/bin/env python3
import json
import pathlib
import re
import sys
from typing import Iterable, Iterator

from jsonschema import Draft202012Validator

ISO_8601_RE = re.compile(
    r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z"
)


def iter_string_values(value: object) -> Iterator[str]:
    if isinstance(value, dict):
        for item in value.values():
            yield from iter_string_values(item)
    elif isinstance(value, list):
        for item in value:
            yield from iter_string_values(item)
    elif isinstance(value, str):
        yield value


def load_json(path: pathlib.Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_schema(name: str, payload: object, schema: dict) -> list[str]:
    validator = Draft202012Validator(schema)
    return [f"{name}: {error.message}" for error in validator.iter_errors(payload)]


def find_timestamp_strings(payload: object) -> Iterable[str]:
    for text in iter_string_values(payload):
        if ISO_8601_RE.search(text):
            yield text


def main() -> int:
    root = pathlib.Path(__file__).resolve().parents[1]
    evidence_dir = root / "evidence"
    if len(sys.argv) > 1:
        evidence_dir = pathlib.Path(sys.argv[1])

    required_files = [
        "report.json",
        "metrics.json",
        "stamp.json",
        "index.json",
    ]

    missing = [name for name in required_files if not (evidence_dir / name).exists()]
    if missing:
        print(f"[FAIL] missing evidence files: {', '.join(missing)}", file=sys.stderr)
        return 1

    schema_dir = root / "schemas" / "evidence"
    schemas = {
        "report.json": load_json(schema_dir / "report.schema.json"),
        "metrics.json": load_json(schema_dir / "metrics.schema.json"),
        "stamp.json": load_json(schema_dir / "stamp.schema.json"),
        "index.json": load_json(schema_dir / "index.schema.json"),
    }

    errors: list[str] = []
    payloads: dict[str, object] = {}
    for filename in required_files:
        payload = load_json(evidence_dir / filename)
        payloads[filename] = payload
        errors.extend(validate_schema(filename, payload, schemas[filename]))

    if errors:
        for error in errors:
            print(f"[FAIL] {error}", file=sys.stderr)
        return 1

    for filename in ["report.json", "metrics.json", "index.json"]:
        timestamps = list(find_timestamp_strings(payloads[filename]))
        if timestamps:
            print(
                f"[FAIL] timestamps found outside stamp.json in {filename}",
                file=sys.stderr,
            )
            return 1

    print("[OK] evidence bundle validated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
