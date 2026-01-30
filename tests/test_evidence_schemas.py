from __future__ import annotations

import json
import re
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError

ROOT = Path(__file__).resolve().parents[1]
SCHEMAS = ROOT / "evidence" / "schemas"
FIXTURES = ROOT / "evidence" / "fixtures" / "kimik25"
TIMESTAMP_VALUE = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def validate(schema_name: str, fixture_name: str) -> None:
    schema = load_json(SCHEMAS / schema_name)
    data = load_json(FIXTURES / fixture_name)
    Draft202012Validator(schema).validate(data)


def scan_for_timestamps(obj: object) -> bool:
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
                    return True
            if scan_for_timestamps(value):
                return True
    elif isinstance(obj, list):
        return any(scan_for_timestamps(item) for item in obj)
    return False


def test_report_schema_ok() -> None:
    validate("report.schema.json", "report.ok.json")


def test_metrics_schema_ok() -> None:
    validate("metrics.schema.json", "metrics.ok.json")


def test_stamp_schema_ok() -> None:
    validate("stamp.schema.json", "stamp.ok.json")


def test_report_schema_missing_evidence_id() -> None:
    schema = load_json(SCHEMAS / "report.schema.json")
    data = load_json(FIXTURES / "report.bad.json")
    with pytest.raises(ValidationError):
        Draft202012Validator(schema).validate(data)


def test_report_timestamp_detected() -> None:
    data = load_json(FIXTURES / "report.timestamp.json")
    assert scan_for_timestamps(data)
