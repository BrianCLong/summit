#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from jsonschema import Draft202012Validator

TIMESTAMP_VALUE = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}")


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    sys.exit(1)


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Could not read JSON from {path}: {exc}")


def iter_index_items(index: dict) -> list[dict]:
    items = index.get("items")
    if items is None:
        return []
    if isinstance(items, dict):
        normalized = []
        for evidence_id, payload in items.items():
            item = {"evidence_id": evidence_id}
            if isinstance(payload, dict):
                item.update(payload)
            normalized.append(item)
        return normalized
    if isinstance(items, list):
        return items
    fail("evidence/index.json items must be a list or object")
    return []


def collect_files(item: dict) -> list[str]:
    if "files" in item and isinstance(item["files"], list):
        return item["files"]
    if "artifacts" in item and isinstance(item["artifacts"], list):
        return item["artifacts"]
    files: list[str] = []
    for key in ("report", "metrics", "stamp"):
        value = item.get(key)
        if isinstance(value, str):
            files.append(value)
    return files


def validate_schema(instance: dict, schema_path: Path) -> None:
    schema = load_json(schema_path)
    Draft202012Validator(schema).validate(instance)


def scan_for_timestamps(obj: object, filename: str) -> None:
    if filename.endswith("stamp.json"):
        return
    if isinstance(obj, dict):
        for key, value in obj.items():
            key_lower = key.lower()
            if (
                "time" in key_lower
                or "timestamp" in key_lower
                or "date" in key_lower
                or "generated" in key_lower
                or "created" in key_lower
            ) and isinstance(value, str):
                if TIMESTAMP_VALUE.search(value):
                    fail(f"timestamp-like field in {filename}/{key}")
            scan_for_timestamps(value, f"{filename}/{key}")
    elif isinstance(obj, list):
        for idx, value in enumerate(obj):
            scan_for_timestamps(value, f"{filename}[{idx}]")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--schemas", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--index", default="evidence/index.json")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    schema_dir = (root / args.schemas).resolve()
    out_dir = (root / args.out).resolve()
    index_path = (root / args.index).resolve()

    if not index_path.exists():
        fail(f"missing evidence index: {index_path}")

    index = load_json(index_path)
    items = iter_index_items(index)
    if not items:
        fail("evidence/index.json has no items")

    for item in items:
        evidence_id = item.get("evidence_id", "unknown")
        files = collect_files(item)
        if not files:
            continue
        out_files = [root / path for path in files if str(root / path).startswith(str(out_dir))]
        if not out_files:
            continue
        required = {"report.json", "metrics.json", "stamp.json"}
        present = {path.name for path in out_files}
        if not required.issubset(present):
            missing = ", ".join(sorted(required - present))
            fail(f"{evidence_id}: missing required artifacts in {out_dir}: {missing}")

        for path in out_files:
            if not path.exists():
                fail(f"{evidence_id}: missing artifact {path}")
            payload = load_json(path)
            scan_for_timestamps(payload, str(path.relative_to(root)))
            if path.name in ("report.json", "metrics.json", "stamp.json"):
                validate_schema(payload, schema_dir / f"{path.name.replace('.json', '')}.schema.json")

    print("evidence schema check: OK")


if __name__ == "__main__":
    main()
