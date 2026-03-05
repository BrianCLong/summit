import json

import pytest

from summit.intent.validator import IntentValidator


def test_valid_intent_schema():
    validator = IntentValidator("schemas/intent_spec.schema.json")

    spec = {
        "intent_id": "SUMMIT-INT-001",
        "objective": {
            "description": "Evaluate Markdown ingestion pipeline",
            "success_criteria": [
                {
                    "metric": "token_reduction_ratio",
                    "operator": ">=",
                    "value": 0.20
                }
            ]
        },
        "constraints": [
            {"type": "deterministic_output"},
            {"type": "no_external_calls"}
        ],
        "stop_rules": [
            {"max_runtime_seconds": 30}
        ]
    }

    result = validator.validate_spec(spec)
    assert result["is_valid"] is True
    assert len(result["errors"]) == 0

def test_invalid_intent_schema():
    validator = IntentValidator("schemas/intent_spec.schema.json")

    spec = {
        "objective": {
            "description": "Missing intent_id"
        }
    }

    result = validator.validate_spec(spec)
    assert result["is_valid"] is False
    assert "intent_id is required" in result["errors"]
