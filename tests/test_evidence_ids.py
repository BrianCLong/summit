import pytest
from summit.evidence.ids import validate_evd_id

def test_evd_id_valid():
    validate_evd_id("EVD-LLMTRAININGCHANGE-EVAL-001")

def test_evd_id_invalid():
    with pytest.raises(ValueError):
        validate_evd_id("EVD-WRONG-001")
