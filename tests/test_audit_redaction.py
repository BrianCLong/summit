from codemode.audit import AuditLogger, redact


def test_redaction_simple():
    data = {"token": "secret123", "public": "visible"}
    redacted = redact(data)
    assert redacted["token"] == "[REDACTED]"
    assert redacted["public"] == "visible"

def test_redaction_nested():
    data = {"wrapper": {"api_key": "xyz", "other": 1}}
    redacted = redact(data)
    assert redacted["wrapper"]["api_key"] == "[REDACTED]"
    assert redacted["wrapper"]["other"] == 1

def test_redaction_list():
    data = [{"token": "s1"}, {"token": "s2"}]
    redacted = redact(data)
    assert redacted[0]["token"] == "[REDACTED]"
    assert redacted[1]["token"] == "[REDACTED]"

def test_audit_logger_redacts_on_store():
    # Verify the payload passed to logger is redacted in the stored/emitted log
    # (Actually my implementation stores the redacted payload)
    logger = AuditLogger()
    payload = {"password": "secret_pass"}
    logger.log_event("test_event", "test_tool", payload)

    assert len(logger.logs) == 1
    entry = logger.logs[0]
    assert entry["payload"]["password"] == "[REDACTED]"
