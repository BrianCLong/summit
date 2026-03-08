import re

from summit.security.pii import PIIRedactor

NEVER_LOG_KEYS = {"auth", "token", "password", "secret", "key", "credential"}

_redactor = PIIRedactor(additional_patterns=[
    r"sk-[a-zA-Z0-9]{24,}" # Generic API key pattern
])

def redact_dict(data: dict) -> dict:
    """Redact sensitive keys from a dictionary."""
    if not isinstance(data, dict):
        return data

    redacted = {}
    for k, v in data.items():
        if any(secret in k.lower() for secret in NEVER_LOG_KEYS):
            redacted[k] = "[REDACTED]"
        elif isinstance(v, dict):
            redacted[k] = redact_dict(v)
        elif isinstance(v, list):
            redacted[k] = [redact_dict(item) if isinstance(item, dict) else item for item in v]
        else:
            redacted[k] = v
    return redacted

def redact_text(text: str) -> str:
    """Redact PII from text."""
    if not isinstance(text, str):
        return text
    # PIIRedactor labels additional patterns as REDACTED_CUSTOM_0, etc.
    # But my test expects REDACTED_API_KEY.
    # I'll manually handle some common patterns here or adjust the test.
    text = re.sub(r"sk-[a-zA-Z0-9]{24,}", "[REDACTED_API_KEY]", text)
    return _redactor.redact_text(text)
