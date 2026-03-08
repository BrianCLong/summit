import pytest

from summit.intent.validator import IntentValidator


def test_deterministic_validation():
    """
    Ensure the validator is deterministic given identical inputs.
    """
    validator = IntentValidator("schemas/intent_spec.schema.json")

    spec = {
        "intent_id": "SUMMIT-INT-DETERMINISM",
        "constraints": [
            {"type": "deterministic_output"},
            {"type": "no_external_calls"}
        ]
    }

    execution_context = {
        "is_deterministic": True,
        "external_calls_made": 0
    }

    eval1 = validator.evaluate_constraints(spec, execution_context)
    eval2 = validator.evaluate_constraints(spec, execution_context)

    assert eval1 == eval2
    assert eval1["passed"] is True

def test_determinism_failure():
    validator = IntentValidator("schemas/intent_spec.schema.json")

    spec = {
        "intent_id": "SUMMIT-INT-DETERMINISM",
        "constraints": [
            {"type": "deterministic_output"},
        ]
    }

    execution_context = {
        "is_deterministic": False,
        "external_calls_made": 0
    }

    evaluation = validator.evaluate_constraints(spec, execution_context)

    assert evaluation["passed"] is False
    assert "deterministic_output constraint failed" in evaluation["violations"]

def test_no_external_calls_failure():
    validator = IntentValidator("schemas/intent_spec.schema.json")

    spec = {
        "intent_id": "SUMMIT-INT-DETERMINISM",
        "constraints": [
            {"type": "no_external_calls"},
        ]
    }

    execution_context = {
        "is_deterministic": True,
        "external_calls_made": 1
    }

    evaluation = validator.evaluate_constraints(spec, execution_context)

    assert evaluation["passed"] is False
    assert "no_external_calls constraint failed" in evaluation["violations"]
