import json
from pathlib import Path

import pytest
from jsonschema import Draft7Validator


SCHEMA_PATH = Path("pipelines/income_engine/income_model.schema.json")


def test_income_schema_accepts_minimal_valid_spec():
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    validator = Draft7Validator(schema)
    spec = {
        "model_type": "digital_product",
        "setup_cost": 500,
        "monthly_traffic": 1000,
        "conversion_rate": 0.02,
        "price": 49,
        "churn_rate": 0.05,
        "monthly_operating_cost": 100,
        "evidence_links": ["https://example.com/evidence"],
    }

    errors = list(validator.iter_errors(spec))
    assert errors == []


def test_income_schema_requires_cost_fields():
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    validator = Draft7Validator(schema)
    invalid_spec = {
        "model_type": "digital_product",
        "setup_cost": 500,
        "monthly_traffic": 1000,
        "conversion_rate": 0.02,
        "price": 49,
        "churn_rate": 0.05,
        "evidence_links": ["https://example.com/evidence"],
    }

    errors = list(validator.iter_errors(invalid_spec))
    assert len(errors) == 1
    assert "monthly_operating_cost" in errors[0].message
