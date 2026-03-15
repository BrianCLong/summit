from cogwar.policy.intent import Intent
from cogwar.policy.rules import classify_intent, evaluate_request


def test_classify_defensive_summary():
    text = "Summarize indicators of coordinated narrative amplification and propose resilience measures."
    intent = classify_intent(text)
    assert intent == Intent.DEFENSIVE_IW


def test_allow_defensive_intent():
    decision = evaluate_request(Intent.DEFENSIVE_IW, {"defense_mode": True, "requester_role": "analyst"})
    assert decision.allowed is True
    assert "Approved" in decision.reason
    assert decision.requires_human_review is False


def test_defensive_intent_requires_review_for_unknown_role():
    decision = evaluate_request(Intent.DEFENSIVE_IW, {"defense_mode": True, "requester_role": "intern"})
    assert decision.allowed is True
    assert decision.requires_human_review is True
