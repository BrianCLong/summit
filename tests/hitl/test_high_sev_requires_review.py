import pytest

from cogwar.hitl.review import submit_for_review
from cogwar.hitl.thresholds import requires_review


def test_high_sev_requires_review():
    warning = {
        "warning_id": "W1",
        "confidence": 0.95,
        "indicators": [{"severity": "high"}]
    }
    assert requires_review(warning) is True

    status = submit_for_review(warning)
    assert status["status"] == "pending_review"

def test_critical_sev_requires_review():
    warning = {
        "warning_id": "W2",
        "confidence": 0.99,
        "indicators": [{"severity": "critical"}]
    }
    assert requires_review(warning) is True

def test_low_conf_requires_review():
    warning = {
        "warning_id": "W3",
        "confidence": 0.5, # Below 0.9
        "indicators": [{"severity": "low"}]
    }
    assert requires_review(warning) is True

def test_auto_approve_low_sev_high_conf():
    warning = {
        "warning_id": "W4",
        "confidence": 0.95,
        "indicators": [{"severity": "low"}]
    }
    assert requires_review(warning) is False

    status = submit_for_review(warning)
    assert status["status"] == "auto_approved"
