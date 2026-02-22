#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable

TIMESTAMP_KEYS = {"created_at", "generated_at", "timestamp", "time", "datetime"}
EVIDENCE_ID_PATTERN = re.compile(r"^EVD-[a-z0-9-]+-[a-z0-9-]+-[0-9]{3}$")


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text())
    except FileNotFoundError as exc:
        raise FileNotFoundError(f"Missing file: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in {path}: {exc}") from exc


def iter_timestamp_keys(data: Any) -> Iterable[str]:
    if isinstance(data, dict):
        for key, value in data.items():
            lowered = key.lower()
            if lowered in TIMESTAMP_KEYS or lowered.endswith("_at"):
                yield key
            yield from iter_timestamp_keys(value)
    elif isinstance(data, list):
        for item in data:
            yield from iter_timestamp_keys(item)


def validate_report(path: Path, data: dict) -> None:
    if not isinstance(data, dict):
        raise ValueError(f"{path} must be an object")

    if {"item_slug", "sources", "claims", "limitations"} & set(data.keys()):
        required = {"evidence_id", "item_slug", "summary", "sources", "claims", "limitations"}
        missing = required - set(data.keys())
        if missing:
            raise ValueError(f"{path} missing required fields: {sorted(missing)}")
        evidence_id = data.get("evidence_id")
        if not isinstance(evidence_id, str) or not EVIDENCE_ID_PATTERN.match(evidence_id):
            raise ValueError(f"{path} evidence_id must match {EVIDENCE_ID_PATTERN.pattern}")
        if not isinstance(data.get("sources"), list):
            raise ValueError(f"{path} sources must be an array")
        if not isinstance(data.get("claims"), list):
            raise ValueError(f"{path} claims must be an array")
        if not isinstance(data.get("limitations"), list):
            raise ValueError(f"{path} limitations must be an array")
    else:
        if not isinstance(data.get("evidence_id"), str):
            raise ValueError(f"{path} evidence_id must be a string")
        if not isinstance(data.get("summary"), str):
            raise ValueError(f"{path} summary must be a string")


def validate_metrics(path: Path, data: dict) -> None:
    if not isinstance(data, dict):
        raise ValueError(f"{path} must be an object")
    if not isinstance(data.get("evidence_id"), str):
        raise ValueError(f"{path} evidence_id must be a string")
    metrics = data.get("metrics")
    if isinstance(metrics, list):
        for idx, entry in enumerate(metrics):
            if not isinstance(entry, dict):
                raise ValueError(f"{path} metrics[{idx}] must be an object")
            for key in ("name", "value", "unit"):
                if key not in entry:
                    raise ValueError(f"{path} metrics[{idx}] missing {key}")
    elif not isinstance(metrics, dict):
        raise ValueError(f"{path} metrics must be an object or array")


def validate_stamp(path: Path, data: dict) -> None:
    if not isinstance(data, dict):
        raise ValueError(f"{path} must be an object")
    if not isinstance(data.get("evidence_id"), str):
        raise ValueError(f"{path} evidence_id must be a string")
    if "created_at" not in data and "generated_at" not in data:
        raise ValueError(f"{path} must include created_at or generated_at")
    if "toolchain" in data:
        toolchain = data["toolchain"]
        if not isinstance(toolchain, dict):
            raise ValueError(f"{path} toolchain must be an object")
        for value in toolchain.values():
            if not isinstance(value, str):
                raise ValueError(f"{path} toolchain values must be strings")


def extract_index_entries(index: dict) -> list[tuple[str, list[str]]]:
    if not isinstance(index, dict):
        raise ValueError("evidence/index.json must be an object")
    if "version" not in index:
        raise ValueError("evidence/index.json missing version")

    entries: list[tuple[str, list[str]]] = []
    items = index.get("items")
    if isinstance(items, list):
        for entry in items:
            if not isinstance(entry, dict):
                raise ValueError("evidence/index.json items must be objects")
            evidence_id = entry.get("evidence_id")
            files = entry.get("files")
            if not isinstance(evidence_id, str) or not isinstance(files, list):
                raise ValueError("evidence/index.json items require evidence_id and files")
            entries.append((evidence_id, files))
    elif isinstance(items, dict):
        for evidence_id, entry in items.items():
            if not isinstance(entry, dict):
                raise ValueError("evidence/index.json item entries must be objects")
            files = entry.get("files") or entry.get("artifacts")
            if not isinstance(files, list):
                raise ValueError(f"evidence/index.json {evidence_id} missing files")
            entries.append((evidence_id, files))
    else:
        raise ValueError("evidence/index.json must contain items list or map")

    return entries


def validate_file(path: Path) -> None:
    data = load_json(path)
    if path.name == "report.json":
        validate_report(path, data)
    elif path.name == "metrics.json":
        validate_metrics(path, data)
    elif path.name == "stamp.json":
        validate_stamp(path, data)
    else:
        return

    if path.name in {"report.json", "metrics.json"}:
        timestamp_keys = sorted(set(iter_timestamp_keys(data)))
        if timestamp_keys:
            raise ValueError(f"{path} contains timestamp fields: {timestamp_keys}")


def main() -> int:
    bundle_root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    index_path = bundle_root / "evidence" / "index.json"
    try:
        index = load_json(index_path)
        entries = extract_index_entries(index)
    except Exception as exc:
        print(f"Evidence index validation failed: {exc}")
        return 2

    error_count = 0
    for _, files in entries:
        for file_path in files:
            path = bundle_root / file_path
            try:
                validate_file(path)
            except Exception as exc:
                print(f"{path}: {exc}")
                error_count += 1

    if error_count:
        print(f"Evidence validation failed with {error_count} error(s)")
        return 1

    print("Evidence validation passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
