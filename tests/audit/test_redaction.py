from summit.audit.redaction import redact

def test_redacts_api_keys_deny_by_default_fixture():
    # Negative fixture (should trigger redaction/deny)
    text = "here is my key sk-ABCDEFGHIJKLMNOPQRSTUVWXYZ123456"
    r = redact(text)
    assert "[REDACTED_SECRET]" in r.redacted_text
    assert "sk-" not in r.redacted_text
    assert "P020_SECRET_DETECTED" in r.reasons

def test_redacts_email_fixture():
    # PII fixture
    text = "contact me at alice@example.com"
    r = redact(text)
    assert "[REDACTED_EMAIL]" in r.redacted_text
    assert "alice@example.com" not in r.redacted_text
    assert "P010_PII_DETECTED" in r.reasons

def test_no_redaction_clean_fixture():
    # Positive fixture (clean)
    text = "Hello world, this is a clean prompt."
    r = redact(text)
    assert r.redacted_text == text
    assert len(r.reasons) == 0
