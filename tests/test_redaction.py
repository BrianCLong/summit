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
