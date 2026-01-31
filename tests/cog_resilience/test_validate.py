import pytest

from modules.cog_resilience.validate import (
    validate_compliance,
    validate_intent,
    validate_no_prohibited_fields,
)


def test_validate_intent_allowed():
    # 'analysis_only' is in allowed_intents
    validate_intent("analysis_only")

def test_validate_intent_prohibited():
    # 'persuasion' is in prohibited_intents
    with pytest.raises(ValueError, match="Prohibited intent: persuasion"):
        validate_intent("persuasion")

def test_validate_intent_unknown_deny_default():
    # 'random_intent' is neither allowed nor prohibited, but default is deny
    with pytest.raises(ValueError, match="Intent not explicitly allowed"):
        validate_intent("random_intent")

def test_validate_fields_clean():
    payload = {
        "time_bucket": "2023-Q1",
        "value": 0.8
    }
    validate_no_prohibited_fields(payload)

def test_validate_fields_prohibited():
    payload = {
        "time_bucket": "2023-Q1",
        "psychographic_segment": "cluster_A"
    }
    with pytest.raises(ValueError, match="Prohibited fields present"):
        validate_no_prohibited_fields(payload)

def test_validate_compliance_success():
    validate_compliance("monitoring_only", {"value": 1.0})

def test_validate_compliance_fail_intent():
    with pytest.raises(ValueError, match="Prohibited intent"):
        validate_compliance("microtargeting", {"value": 1.0})

def test_validate_compliance_fail_fields():
    with pytest.raises(ValueError, match="Prohibited fields"):
        validate_compliance("analysis_only", {"individual_id": "123"})
