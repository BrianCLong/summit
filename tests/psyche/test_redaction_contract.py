import pytest

from summit.psyche.redaction import assert_no_pii_in_evidence, scrub_pii


def test_scrub_pii_contract():
    text = "Hello world"
    scrubbed, report = scrub_pii(text)
    assert scrubbed == text # Stub behavior
    assert "scrubbed_count" in report

def test_assert_no_pii_allows_safe_data():
    data = {"safe": "value", "nested": {"also": "safe"}}
    assert_no_pii_in_evidence(data)

def test_assert_no_pii_raises_on_forbidden_key():
    data = {"safe": "value", "raw_text": "secret"}
    with pytest.raises(ValueError, match="Forbidden PII key"):
        assert_no_pii_in_evidence(data)

def test_assert_no_pii_raises_on_nested_forbidden_key():
    data = {"safe": "value", "nested": {"email": "test@example.com"}}
    with pytest.raises(ValueError, match="Forbidden PII key"):
        assert_no_pii_in_evidence(data)
