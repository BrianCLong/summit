from summit.audit.events import PromptEvent
from summit.audit.policy import evaluate_event_with_redaction

def test_policy_missing_purpose():
    event = PromptEvent(
        event_id="1", tenant="t1", actor="user", purpose="",
        classification="internal", model_id="gpt-4"
    )
    decision = evaluate_event_with_redaction(event, [])
    assert decision.action == "deny"
    assert "MISSING_PURPOSE" in decision.reasons

def test_policy_invalid_classification():
    event = PromptEvent(
        event_id="1", tenant="t1", actor="user", purpose="debugging",
        classification="super-secret", model_id="gpt-4"
    )
    decision = evaluate_event_with_redaction(event, [])
    assert decision.action == "deny"
    assert "INVALID_CLASSIFICATION" in decision.reasons

def test_policy_secret_deny():
    event = PromptEvent(
        event_id="1", tenant="t1", actor="user", purpose="debugging",
        classification="internal", model_id="gpt-4"
    )
    # Simulate redaction finding a secret
    decision = evaluate_event_with_redaction(event, ["P020_SECRET_DETECTED"])
    assert decision.action == "deny"
    assert "P020_SECRET_DETECTED" in decision.reasons

def test_policy_pii_redact():
    event = PromptEvent(
        event_id="1", tenant="t1", actor="user", purpose="outreach",
        classification="internal", model_id="gpt-4"
    )
    # Simulate redaction finding PII (policy says redact, not deny)
    decision = evaluate_event_with_redaction(event, ["P010_PII_DETECTED"])
    # Based on the yaml I wrote:
    # redact_if_reasons: [P010_PII_DETECTED]
    assert decision.action == "redact"
    assert "P010_PII_DETECTED" in decision.reasons

def test_policy_allow_clean():
    event = PromptEvent(
        event_id="1", tenant="t1", actor="user", purpose="chat",
        classification="public", model_id="gpt-4"
    )
    decision = evaluate_event_with_redaction(event, [])
    assert decision.action == "allow"
