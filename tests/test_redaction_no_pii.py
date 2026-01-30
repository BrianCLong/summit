import pytest
from modules.reports.redaction import redact


def test_redact_sensitive_keys():
    data = {"safe": "value", "emails": ["a@b.com"], "nested": {"raw_text": "secret"}}
    redacted = redact(data)
    assert redacted["emails"] == "[REDACTED]"
    assert redacted["nested"]["raw_text"] == "[REDACTED]"
    assert redacted["safe"] == "value"

def test_redact_pii_values():
    data = {"info": "Contact me at bob@example.com"}
    redacted = redact(data)
    assert redacted["info"] == "[REDACTED_PII]"
