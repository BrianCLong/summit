import pytest

from summit.orchestration.policy.trace_redaction import TraceRedactor


def test_redact_email():
    redactor = TraceRedactor()
    text = "Contact me at alice@example.com for more info."
    assert redactor.redact_text(text) == "Contact me at [REDACTED_EMAIL] for more info."

def test_redact_api_key():
    redactor = TraceRedactor()
    text = "My api_key: sk-1234567890abcdef12345 is private."
    redacted = redactor.redact_text(text)
    assert "[REDACTED_SECRET]" in redacted
    assert "sk-1234567890abcdef12345" not in redacted

def test_redact_debate():
    redactor = TraceRedactor()
    debate = [
        {"persona": "Planner", "text": "Send it to bob@work.com"},
        {"persona": "CriticalVerifier", "text": "Secret token=xyz1234567890abcdef is exposed"}
    ]
    redacted = redactor.redact_debate(debate)
    assert redacted[0]["text"] == "Send it to [REDACTED_EMAIL]"
    assert "[REDACTED_SECRET]" in redacted[1]["text"]
