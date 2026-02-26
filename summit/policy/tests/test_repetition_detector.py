import pytest
from summit.policy.repetition_detector import classify_repetition, RepetitionPolicyRule
from summit.protocols.envelope import SummitEnvelope

def test_no_repetition():
    text = "This is a unique sentence. This is another one."
    result = classify_repetition(text)
    assert result["class"] == "none"
    assert result["score"] == 0

def test_beneficial_repetition():
    # Short sentence repeated multiple times (reinforcement)
    text = "Don't forget the milk. Don't forget the milk. Please."
    result = classify_repetition(text)
    # "Don't forget the milk" is < 200 chars.
    # It appears 2 times.
    # Score = len * (2-1) = len
    assert result["class"] == "beneficial"
    assert result["score"] > 0
    assert len(result["details"]) == 1
    assert result["details"][0]["type"] == "beneficial"

def test_harmful_repetition():
    # Long sentence repeated
    long_sentence = "This is a very long sentence that is intended to trigger the harmful repetition detector because it exceeds the character threshold that we have set for beneficial reinforcement which is currently 200 characters so we need to make sure this sentence is actually longer than that limit."
    # Ensure it's long enough
    while len(long_sentence) < 200:
        long_sentence += " extending..."

    text = f"{long_sentence}. {long_sentence}."
    result = classify_repetition(text)
    assert result["class"] == "harmful"
    assert result["score"] > 0
    assert result["details"][0]["type"] == "harmful"

def test_mixed_repetition():
    # Both types, harmful dominates
    long_s = "A" * 250
    short_s = "B" * 10
    text = f"{long_s}. {long_s}. {short_s}. {short_s}."
    result = classify_repetition(text)
    # Harmful score: 250
    # Beneficial score: 10
    assert result["class"] == "harmful"
    assert result["score"] == 250

def test_policy_rule_check():
    rule = RepetitionPolicyRule(threshold=100)

    # Harmful case
    long_s = "X" * 250
    text = f"{long_s}. {long_s}."
    env = SummitEnvelope(
        message_id="1", conversation_id="1", sender="user", recipient="bot",
        intent="REQUEST", text=text, tool_calls=[]
    )

    reasons = rule.check(env)
    assert len(reasons) == 1
    assert "harmful_repetition_detected" in reasons[0]

    # Benign case
    env = SummitEnvelope(message_id="2", conversation_id="1", sender="user", recipient="bot", intent="REQUEST", text="Just a normal prompt.", tool_calls=[])
    reasons = rule.check(env)
    assert len(reasons) == 0
