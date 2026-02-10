from __future__ import annotations

import json
from pathlib import Path

import jsonschema
import pytest

SCHEMA_DIR = Path("summit/evidence/schemas")
FIXTURE_DIR = Path("tests/fixtures/evidence")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def validate(schema_name: str, payload: dict) -> None:
    schema = load_json(SCHEMA_DIR / schema_name)
    jsonschema.Draft202012Validator(schema).validate(payload)


def test_evidence_schemas_pass_bundle() -> None:
    bundle = FIXTURE_DIR / "pass_bundle"
    validate("report.schema.json", load_json(bundle / "report.json"))
    validate("metrics.schema.json", load_json(bundle / "metrics.json"))
    validate("stamp.schema.json", load_json(bundle / "stamp.json"))
    validate(
        "evidence.index.schema.json",
        load_json(bundle / "evidence" / "index.json"),
    )


def test_evidence_metrics_schema_rejects_missing_metrics() -> None:
    bundle = FIXTURE_DIR / "fail_bundle_missing_metrics"
    payload = load_json(bundle / "metrics.json")
    with pytest.raises(jsonschema.ValidationError):
        validate("metrics.schema.json", payload)
