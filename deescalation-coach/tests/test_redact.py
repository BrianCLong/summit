from app.redact import redact_text


def test_redact_patterns():
    text = "email me at foo@example.com or call +1234567890"  # contains email and phone
    redacted, changed = redact_text(text)
    assert "[REDACTED]" in redacted
    assert changed


def test_url_normalization():
    text = "see https://example.com/test"
    redacted, _ = redact_text(text)
    assert redacted == "see URL"
