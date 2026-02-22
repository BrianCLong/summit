import pytest
from summit.security.redaction import redact_text, redact_structure

def test_redact_api_key():
    text = "My key is sk-1234567890abcdef12345678"
    redacted = redact_text(text)
    assert "sk-" not in redacted
    assert "[REDACTED]" in redacted

def test_redact_github_token():
    text = "Token: ghp_1234567890abcdef12345678"
    redacted = redact_text(text)
    assert "ghp_" not in redacted

def test_redact_structure():
    data = {
        "env": ["sk-1234567890abcdef12345678"],
        "safe": "hello"
    }
    redacted = redact_structure(data)
    assert "[REDACTED]" in redacted["env"][0]
    assert redacted["safe"] == "hello"
