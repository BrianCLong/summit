import pytest

from cogwar.iw.warning import generate_warning


def test_warning_has_caveats():
    indicators = [{
        "id": "IND-123",
        "name": "Test Ind",
        "severity": "medium",
        "confidence": 0.8
    }]
    warning = generate_warning(indicators)
    assert warning is not None
    assert "caveats" in warning
    assert len(warning["caveats"]) > 0
    assert "Analysis is based on limited observation window." in warning["caveats"]
