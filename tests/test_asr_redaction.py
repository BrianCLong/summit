from asr.security import redact_for_logs


def test_redact_for_logs_masks_sensitive_fields() -> None:
    payload = {
        "audio": "base64payload",
        "context": "sensitive context",
        "language": "en",
    }

    redacted = redact_for_logs(payload)

    assert redacted["audio"] == "<redacted>"
    assert redacted["context"] == "<redacted>"
    assert redacted["language"] == "en"
