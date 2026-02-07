from summit.security.redaction import DEFAULT_NEVER_LOG_KEYS, redact_record


def test_redaction_scrubs_never_log_keys_and_pii() -> None:
    record = {
        "prompt": "secret prompt",
        "response": "user@example.com",
        "metadata": {"token": "abc123", "note": "email me at user@example.com"},
    }
    result = redact_record(record, never_log_keys=DEFAULT_NEVER_LOG_KEYS)
    assert result.record["prompt"] == "[REDACTED]"
    assert result.record["response"] == "[REDACTED]"
    assert result.record["metadata"]["token"] == "[REDACTED]"
    assert "[REDACTED_EMAIL]" in result.record["metadata"]["note"]
    assert result.redacted_fields >= 3
