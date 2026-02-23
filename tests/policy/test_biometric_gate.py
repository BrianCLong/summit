from summit.policy.biometric_gate import evaluate

POLICY = {
    "enabled": True,
    "classes": {
        "command_decode": "allow",
        "identity_inference": "deny",
        "emotion_inference": "deny",
        "physiology_inference": "deny",
    },
}


def test_deny_identity_even_with_consent() -> None:
    decision = evaluate({"class": "identity_inference", "has_consent": True}, POLICY)
    assert decision.allowed is False


def test_allow_command_decode_without_consent() -> None:
    decision = evaluate({"class": "command_decode", "has_consent": False}, POLICY)
    assert decision.allowed is True
