from __future__ import annotations

import json
from pathlib import Path

import jsonschema

SCHEMA_DIR = Path("evidence/schemas")
BUNDLE_DIR = Path("evidence/EVD-shared-memory-orch-001")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def test_shared_memory_orch_report_schema() -> None:
    schema = load_json(SCHEMA_DIR / "shared-memory-orch-report.schema.json")
    report = load_json(BUNDLE_DIR / "report.json")
    jsonschema.validate(instance=report, schema=schema)


def test_shared_memory_orch_metrics_schema() -> None:
    schema = load_json(SCHEMA_DIR / "shared-memory-orch-metrics.schema.json")
    metrics = load_json(BUNDLE_DIR / "metrics.json")
    jsonschema.validate(instance=metrics, schema=schema)


def test_shared_memory_orch_stamp_schema() -> None:
    schema = load_json(SCHEMA_DIR / "shared-memory-orch-stamp.schema.json")
    stamp = load_json(BUNDLE_DIR / "stamp.json")
    jsonschema.validate(instance=stamp, schema=schema)
