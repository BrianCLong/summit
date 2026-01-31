from summit.policy.biometric_gate import evaluate

POLICY = {
  "enabled": True,
  "classes": {
    "command_decode": "allow",
    "identity_inference": "deny",
    "emotion_inference": "deny",
    "physiology_inference": "deny"
  }
}

def test_deny_identity_even_with_consent():
    d = evaluate({"class": "identity_inference", "has_consent": True}, POLICY)
    assert d.allowed is False
    assert "class_denied" in d.reason

def test_allow_command_decode_without_consent():
    d = evaluate({"class": "command_decode", "has_consent": False}, POLICY)
    assert d.allowed is True
    assert d.reason == "allowed"

def test_deny_unknown_class():
    d = evaluate({"class": "unknown_class"}, POLICY)
    assert d.allowed is False
    assert "class_denied" in d.reason

def test_gate_disabled():
    disabled_policy = {"enabled": False}
    d = evaluate({"class": "identity_inference"}, disabled_policy)
    assert d.allowed is True
    assert d.reason == "gate_disabled"
