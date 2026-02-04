from packages.common.privacy import PrivacyGuard, redact_dict


def test_never_log_fields_are_redacted():
  sensitive = {
    "user_id": "123",
    "token": "secret_abc",
    "nested": {
      "api_key": "key_123",
      "safe": "val"
    },
    "list": [
      {"password": "pw", "id": 1}
    ]
  }
  safe = redact_dict(sensitive)

  assert safe["user_id"] == "123"
  assert safe["token"] == "[REDACTED]"
  assert safe["nested"]["api_key"] == "[REDACTED]"
  assert safe["nested"]["safe"] == "val"
  assert safe["list"][0]["password"] == "[REDACTED]"
  assert safe["list"][0]["id"] == 1

def test_nested_list_redaction():
    sensitive = {
        "data": [
            ["safe", {"token": "secret"}],
            {"nested": [{"password": "pw"}]}
        ]
    }
    safe = redact_dict(sensitive)
    assert safe["data"][0][1]["token"] == "[REDACTED]"
    assert safe["data"][1]["nested"][0]["password"] == "[REDACTED]"

def test_privacy_guard_wrapper():
    payload = {"secret": "fail"}
    safe = PrivacyGuard.ensure_safe_for_logging(payload)
    assert safe["secret"] == "[REDACTED]"
