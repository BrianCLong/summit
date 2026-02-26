import json
from pathlib import Path

import pytest

from pipelines.income_engine.engine import FEATURE_FLAG, IncomeEngineError, run_income_engine


SCHEMA_PATH = Path("pipelines/income_engine/income_model.schema.json")


def _spec():
    return {
        "model_type": "digital_product",
        "setup_cost": 500,
        "monthly_traffic": 1000,
        "conversion_rate": 0.02,
        "price": 49,
        "churn_rate": 0.05,
        "monthly_operating_cost": 120,
        "automation_share": 0.8,
        "manual_hours_per_month": 4,
        "evidence_links": ["https://example.com/source"],
    }


def test_income_engine_requires_feature_flag(tmp_path):
    with pytest.raises(IncomeEngineError):
        run_income_engine(_spec(), tmp_path, SCHEMA_PATH)


def test_income_engine_emits_deterministic_artifacts(tmp_path):
    first_dir = tmp_path / "first"
    second_dir = tmp_path / "second"
    flags = {FEATURE_FLAG: True}

    run_income_engine(_spec(), first_dir, SCHEMA_PATH, feature_flags=flags, run_date="20260226")
    run_income_engine(_spec(), second_dir, SCHEMA_PATH, feature_flags=flags, run_date="20260226")

    for artifact in ["report.json", "metrics.json", "stamp.json"]:
        first = (first_dir / artifact).read_text(encoding="utf-8")
        second = (second_dir / artifact).read_text(encoding="utf-8")
        assert first == second

    report = json.loads((first_dir / "report.json").read_text(encoding="utf-8"))
    assert report["evidence_id"].startswith("EVID-INCOME-20260226-")


def test_income_engine_projection_values(tmp_path):
    flags = {FEATURE_FLAG: True}
    run_income_engine(_spec(), tmp_path, SCHEMA_PATH, feature_flags=flags, run_date="20260226")

    report = json.loads((tmp_path / "report.json").read_text(encoding="utf-8"))
    metrics = json.loads((tmp_path / "metrics.json").read_text(encoding="utf-8"))

    assert report["projection"]["monthly_revenue"] == 931.0
    assert report["projection"]["annual_net"] == 9232.0
    assert set(metrics.keys()) == {"asset_leverage_index", "recurrence_score", "simplicity_score"}
