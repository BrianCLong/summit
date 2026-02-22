import pytest
from summit.security.pii import PIIRedactor, enforce_never_embed


def test_redact_text_email():
    redactor = PIIRedactor()
    text = "Contact me at jules@example.com"
    result = redactor.redact_text(text)
    assert "jules@example.com" not in result
    assert "[REDACTED_EMAIL]" in result

def test_redact_text_phone():
    redactor = PIIRedactor()
    text = "Call 123-456-7890"
    result = redactor.redact_text(text)
    assert "123-456-7890" not in result
    assert "[REDACTED_PHONE]" in result

def test_redact_structured_sensitive_keys():
    redactor = PIIRedactor()
    data = {
        "user": "jules",
        "password": "supersecretpassword",
        "profile": {
            "email": "jules@example.com"
        }
    }
    result = redactor.redact_structured(data)
    assert result["password"] == "[REDACTED_KEY]"
    assert result["profile"]["email"] == "[REDACTED_EMAIL]"
    assert result["user"] == "jules"

def test_enforce_never_embed():
    data = {"id": 1, "ssn": "000-00-0000", "token": "abc"}
    never_embed = ["ssn", "token"]
    result = enforce_never_embed(data, never_embed)
    assert "id" in result
    assert "ssn" not in result
    assert "token" not in result
