import pytest

from cogwar.policy.intent import Intent
from cogwar.policy.rules import classify_intent, evaluate_request


def test_classify_defensive_summary():
    text = "Summarize indicators of coordinated narrative amplification and propose resilience measures."
    intent = classify_intent(text)
    assert intent == Intent.DEFENSIVE_IW

def test_allow_defensive_intent():
    decision = evaluate_request(Intent.DEFENSIVE_IW)
    assert decision.allowed is True
    assert "Approved" in decision.reason
