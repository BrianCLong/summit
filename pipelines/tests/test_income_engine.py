"""Tests for deterministic Income Engine behavior."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from pipelines.income_engine.engine import IncomeEngine


@pytest.fixture
def valid_spec() -> dict:
    return {
        "model_type": "digital_product",
        "setup_cost": 500,
        "monthly_operating_cost": 100,
        "monthly_traffic": 1000,
        "conversion_rate": 0.02,
        "price": 49,
        "churn_rate": 0.05,
        "evidence_links": ["https://example.org/evidence/item-claim-01"],
        "evidence_date": "20260226",
    }


def test_schema_validation_requires_evidence(valid_spec: dict) -> None:
    engine = IncomeEngine()
    invalid = {k: v for k, v in valid_spec.items() if k != "evidence_links"}

    with pytest.raises(ValueError, match="evidence"):
        engine.validate_spec(invalid)


def test_run_emits_deterministic_artifacts(valid_spec: dict, tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("SUMMIT_ENABLE_INCOME_ENGINE", "1")
    engine = IncomeEngine()

    report_1, metrics_1, stamp_1 = engine.run(valid_spec, tmp_path / "run-a")
    report_2, metrics_2, stamp_2 = engine.run(valid_spec, tmp_path / "run-b")

    assert report_1 == report_2
    assert metrics_1 == metrics_2
    assert stamp_1 == stamp_2

    for run_name in ("run-a", "run-b"):
        for artifact in ("report.json", "metrics.json", "stamp.json"):
            assert (tmp_path / run_name / artifact).exists()


def test_feature_flag_disabled_by_default(valid_spec: dict, tmp_path: Path, monkeypatch) -> None:
    monkeypatch.delenv("SUMMIT_ENABLE_INCOME_ENGINE", raising=False)

    with pytest.raises(RuntimeError, match="disabled"):
        IncomeEngine().run(valid_spec, tmp_path)


def test_claim_linter_blocks_hype_claims(valid_spec: dict, tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("SUMMIT_ENABLE_INCOME_ENGINE", "1")
    invalid = dict(valid_spec)
    invalid["claims"] = ["Guaranteed income with zero risk"]

    with pytest.raises(ValueError, match="hype"):
        IncomeEngine().run(invalid, tmp_path)


def test_acceptance_projection_fields(valid_spec: dict, tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("SUMMIT_ENABLE_INCOME_ENGINE", "1")
    report, metrics, stamp = IncomeEngine().run(valid_spec, tmp_path)

    assert report["projection"]["projected_revenue"] == 11172.0
    assert set(metrics.keys()) == {
        "asset_leverage_index",
        "recurrence_score",
        "simplicity_score",
    }
    assert stamp["evidence_id"].startswith("EVID-INCOME-20260226-")

    report_json = json.loads((tmp_path / "report.json").read_text(encoding="utf-8"))
    assert report_json["evidence_id"] == stamp["evidence_id"]
