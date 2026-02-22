import pytest

from modules.info_integrity.validate import (
    validate_payload_no_prohibited_fields,
    validate_request_intent,
)


def test_validate_request_intent():
    # Positive
    validate_request_intent("analysis_only")

    # Negative
    with pytest.raises(ValueError, match="Prohibited intent: persuasion"):
        validate_request_intent("persuasion")

def test_validate_payload_no_prohibited_fields():
    # Positive
    validate_payload_no_prohibited_fields({"region": "EU", "topic": "election"})

    # Negative
    with pytest.raises(ValueError, match=r"Prohibited fields present: \['individual_id'\]"):
        validate_payload_no_prohibited_fields({"individual_id": "123", "topic": "election"})

    with pytest.raises(ValueError, match=r"Prohibited fields present: \['device_id', 'persona_target'\]"):
        validate_payload_no_prohibited_fields({"device_id": "D1", "persona_target": "T1"})
