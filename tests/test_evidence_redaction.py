from summit.self_evolve.redact import redact_dict

def test_evidence_redaction():
    data = {
        "api_key": "sk-123456",
        "user_email": "USER_DOT_EMAIL_DOT_REDACTED",
        "normal_field": "hello",
        "nested": {
            "password": "secret_pass",
            "token": "bearer xyz"
        },
        "list": [
            {"auth_token": "abc"},
            "plain text"
        ]
    }

    redacted = redact_dict(data)

    assert redacted["api_key"] == "[REDACTED]"
    assert redacted["user_email"] == "[EMAIL_REDACTED]"
    assert redacted["normal_field"] == "hello"
    assert redacted["nested"]["password"] == "[REDACTED]"
    assert redacted["nested"]["token"] == "[REDACTED]"
    assert redacted["list"][0]["auth_token"] == "[REDACTED]"
    assert redacted["list"][1] == "plain text"
