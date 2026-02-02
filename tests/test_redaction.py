from summit_harness.redaction import redact_dict, redact_text

def test_redact_dict_keys():
    data = {
        "user": "jules",
        "api_key": "secret-123",
        "nested": {
            "token": "abc-456"
        }
    }
    redacted = redact_dict(data)
    assert redacted["user"] == "jules"
    assert redacted["api_key"] == "[REDACTED]"
    assert redacted["nested"]["token"] == "[REDACTED]"

def test_redact_api_key_text():
    text = "My key is sk-1234567890123456789012345"
    redacted = redact_text(text)
    assert "sk-1234567890123456789012345" not in redacted
    assert "[REDACTED_API_KEY]" in redacted

def test_redact_pii_compatibility():
    # Ensure existing PII patterns from intelgraph.governance still work
    text = "Contact me at user@example.com or 555-123-4567."
    redacted = redact_text(text)
    assert "[REDACTED_EMAIL]" in redacted
    assert "[REDACTED_PHONE]" in redacted
