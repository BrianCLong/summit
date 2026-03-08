from intelgraph.governance import DatasetCard, redact_text, scan_text


def test_redact_email():
    text = "Contact me at user@example.com."
    redacted = redact_text(text)
    assert redacted == "Contact me at [REDACTED_EMAIL]."
    assert redact_text(redacted) == redacted  # Idempotency


def test_redact_phone():
    text = "Call 555-123-4567 or (555) 123-4567."
    redacted = redact_text(text)
    assert "[REDACTED_PHONE]" in redacted
    assert "555" not in redacted


def test_redact_ssn():
    text = "SSN is 123-45-6789."
    redacted = redact_text(text)
    assert redacted == "SSN is [REDACTED_SSN]."


def test_scan_text():
    text = "user@example.com and 123-45-6789"
    counts = scan_text(text)
    assert counts.get("email") == 1
    assert counts.get("ssn") == 1
    assert "phone" not in counts


def test_dataset_card_markdown():
    card = DatasetCard(
        name="Test Data",
        source="Internal",
        license="Proprietary",
        pii_notes="None",
        intended_use="Testing",
        limitations="None",
    )
    md = card.to_markdown()
    assert "# Dataset Card: Test Data" in md
    assert "**License**: Proprietary" in md


from summit_harness.redaction import redact_dict
from summit_harness.redaction import redact_text as harness_redact_text


def test_harness_redact_dict_secrets():
    data = {"api_key": "secret123", "user": "alice", "nested": {"password": "p1"}}
    redacted = redact_dict(data)
    assert redacted["api_key"] == "[REDACTED]"
    assert redacted["user"] == "alice"
    assert redacted["nested"]["password"] == "[REDACTED]"

def test_harness_redact_api_key_text():
    text = "My key is sk-1234567890123456789012345"
    redacted = harness_redact_text(text)
    assert "sk-1234567890123456789012345" not in redacted
    assert "[REDACTED_API_KEY]" in redacted

def test_harness_redact_pii_text():
    text = "Email me at alice@example.com"
    redacted = harness_redact_text(text)
    assert "alice@example.com" not in redacted
    assert "[REDACTED_EMAIL]" in redacted
