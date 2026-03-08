from __future__ import annotations

import json
from pathlib import Path

import pytest

from summit.evidence.validator import (
    validate_index,
    validate_metrics,
    validate_report,
    validate_stamp,
)

FIXTURE_DIR = Path("tests/fixtures/evidence")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def test_evidence_schemas_pass_bundle() -> None:
    bundle = FIXTURE_DIR / "pass_bundle"
    validate_report(load_json(bundle / "report.json"))
    validate_metrics(load_json(bundle / "metrics.json"))
    validate_stamp(load_json(bundle / "stamp.json"))
    validate_index(load_json(bundle / "evidence" / "index.json"))


def test_evidence_metrics_schema_rejects_missing_metrics() -> None:
    bundle = FIXTURE_DIR / "fail_bundle_missing_metrics"
    payload = load_json(bundle / "metrics.json")
    with pytest.raises(ValueError):
        validate_metrics(payload)
