#!/usr/bin/env python3
import json
import sys
from pathlib import Path

INDEX_PATH = Path("evidence/index.json")

REQUIRED_REPORT_FIELDS = {"evidence_id", "item_slug", "claims", "decisions", "findings"}
REQUIRED_METRICS_FIELDS = {"evidence_id", "metrics"}
REQUIRED_STAMP_FIELDS = {"evidence_id", "tool_versions", "generated_at"}


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


def validate_evidence_files(files: list[str]) -> None:
    for file_path in files:
        path = Path(file_path)
        data = load_json(path)
        if path.name == "report.json":
            validate_required_fields(data, REQUIRED_REPORT_FIELDS, path)
        elif path.name == "metrics.json":
            validate_required_fields(data, REQUIRED_METRICS_FIELDS, path)
        elif path.name == "stamp.json":
            validate_required_fields(data, REQUIRED_STAMP_FIELDS, path)


def main() -> int:
    try:
        index = load_json(INDEX_PATH)
    except Exception:
        return 2

    evidence = index.get("evidence")
    if not isinstance(evidence, dict) or not evidence:
        print("evidence/index.json must include at least one evidence entry")
        return 3

    for evidence_id, entry in evidence.items():
        files = entry.get("files")
        if not isinstance(files, list) or not files:
            print(f"{evidence_id} missing files list")
            return 4
        try:
            validate_evidence_files(files)
        except (ValueError, FileNotFoundError, json.JSONDecodeError) as exc:
            print(exc)
            return 5

    print("Evidence validation passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
