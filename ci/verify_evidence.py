#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_DIR = ROOT / "schemas" / "evidence"
EVIDENCE_DIR = ROOT / "evidence"

TIMESTAMP_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:")


def fail(msg: str) -> None:
    print(f"FAIL: {msg}", file=sys.stderr)
    sys.exit(1)


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Could not read JSON from {path}: {exc}")


def load_sensitive_keys() -> list[str]:
    policy_path = ROOT / "pp_alerts" / "policy" / "sensitive_fields.json"
    if not policy_path.exists():
        fail(f"Policy file missing: {policy_path}")
    data = load_json(policy_path)
    return data.get("sensitive_keys", [])


SENSITIVE_KEYS = load_sensitive_keys()


def has_sensitive_key(data: object, sensitive_key: str) -> bool:
    if isinstance(data, dict):
        if sensitive_key in data:
            return True
        return any(has_sensitive_key(v, sensitive_key) for v in data.values())
    if isinstance(data, list):
        return any(has_sensitive_key(v, sensitive_key) for v in data)
    return False


def scan_file(filepath: Path) -> None:
    print(f"Scanning {filepath}...")
    try:
        content = filepath.read_text(encoding="utf-8")
    except Exception as exc:
        print(f"Could not read {filepath}: {exc}")
        return

    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        for key in SENSITIVE_KEYS:
            if f'"{key}"' in content or f"'{key}'" in content:
                fail(f"Sensitive key '{key}' string found in {filepath}")
        return

    for key in SENSITIVE_KEYS:
        if has_sensitive_key(data, key):
            fail(f"Sensitive key '{key}' found in {filepath}")


def validate_schema(instance: dict, schema_path: Path) -> None:
    schema = load_json(schema_path)
    Draft202012Validator(schema).validate(instance)


def contains_timestamp_field(obj: object, path: str, evidence_id: str) -> None:
    if isinstance(obj, dict):
        for key, value in obj.items():
            key_lower = key.lower()
            if ("time" in key_lower or "timestamp" in key_lower) and isinstance(value, str):
                if TIMESTAMP_PATTERN.search(value):
                    raise AssertionError(
                        f"timestamp-like field in {path}/{key} for {evidence_id}"
                    )
            contains_timestamp_field(value, f"{path}/{key}", evidence_id)
    elif isinstance(obj, list):
        for index, value in enumerate(obj):
            contains_timestamp_field(value, f"{path}[{index}]", evidence_id)


def validate_evidence_index() -> None:
    index_path = EVIDENCE_DIR / "index.json"
    if not index_path.exists():
        print("missing evidence/index.json")
        return

    index = load_json(index_path)
    validate_schema(index, SCHEMA_DIR / "index.schema.json")

    for item in index.get("items", []):
        evidence_id = item.get("evidence_id", "unknown")
        for rel_path in item.get("files", []):
            artifact_path = ROOT / rel_path
            if not artifact_path.exists():
                fail(f"missing evidence artifact: {artifact_path} for {evidence_id}")

            artifact = load_json(artifact_path)
            name = artifact_path.name
            if name == "report.json":
                validate_schema(artifact, SCHEMA_DIR / "report.schema.json")
                contains_timestamp_field(artifact, "report.json", evidence_id)
            elif name == "metrics.json":
                validate_schema(artifact, SCHEMA_DIR / "metrics.schema.json")
                contains_timestamp_field(artifact, "metrics.json", evidence_id)
            elif name == "stamp.json":
                validate_schema(artifact, SCHEMA_DIR / "stamp.schema.json")
            else:
                print(f"WARN: Unrecognized evidence artifact type {artifact_path}")

    print("evidence verification: OK")


def main() -> None:
    paths_to_scan: list[Path] = []

    evidence_dir = ROOT / "evidence"
    pp_alerts_evidence = ROOT / "pp_alerts" / "evidence"

    if evidence_dir.exists():
        paths_to_scan.extend(evidence_dir.glob("**/*.json"))
    if pp_alerts_evidence.exists():
        paths_to_scan.extend(pp_alerts_evidence.glob("**/*.json"))

    for path in paths_to_scan:
        if "schema" in str(path):
            continue
        if path.name == "sensitive_fields.json":
            continue
        scan_file(path)

    validate_evidence_index()

    print("Privacy scan passed.")


if __name__ == "__main__":
    sys.exit(main())
