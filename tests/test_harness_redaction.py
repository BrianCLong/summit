from summit_harness.redaction import is_field_sensitive, redact_secrets


def test_harness_redact_secrets_key_value():
    input_text = "Connecting with api_key=sk-12345 and token=abcde"
    expected = "Connecting with api_key=[REDACTED] and token=[REDACTED]"
    assert redact_secrets(input_text) == expected

def test_harness_redact_secrets_json_style():
    input_text = '{"api_key": "sk-12345", "user": "alice"}'
    expected = '{"api_key": "[REDACTED]", "user": "alice"}'
    assert redact_secrets(input_text) == expected

def test_harness_is_field_sensitive():
    assert is_field_sensitive("api_key") is True
    assert is_field_sensitive("API_KEY") is True
    assert is_field_sensitive("username") is False
