import pytest

from cogwar.iw.warning import generate_warning


def test_warning_has_evidence_refs():
    indicators = [{
        "id": "IND-123",
        "name": "Test Ind",
        "severity": "medium",
        "confidence": 0.8,
        "evidence_refs": ["EVD-1"]
    }]
    warning = generate_warning(indicators)
    assert warning is not None
    assert "evidence_refs" in warning
    assert "IND-123" in warning["evidence_refs"]
