import re
from typing import Any, Dict

# Simple regex-based patterns for sensitive data (expand as needed)
PATTERNS = {
    "email": re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"),
    "api_key": re.compile(r"sk-[a-zA-Z0-9]{20,}")
}

def sanitize_value(value: Any) -> Any:
    """Recursively redact sensitive patterns from strings."""
    if isinstance(value, str):
        for name, pattern in PATTERNS.items():
            value = pattern.sub(f"<{name.upper()}_REDACTED>", value)
        return value
    elif isinstance(value, dict):
        return {k: sanitize_value(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [sanitize_value(v) for v in value]
    return value

def sanitize_event(event_dict: dict[str, Any]) -> dict[str, Any]:
    """
    Sanitizes a dictionary representing an event.
    Ensures keys are safe and values are redacted.
    """
    # In a strict implementation, we might also filter keys.
    # Here we focus on value redaction.
    return sanitize_value(event_dict)

if __name__ == "__main__":
    # Self-test / Verification
    test_data = {
        "user": "john.doe@example.com",
        "key": "sk-1234567890abcdef1234567890",
        "safe": "hello world",
        "nested": {"email": "jane@test.org"}
    }
    redacted = sanitize_event(test_data)

    assert redacted["user"] == "<EMAIL_REDACTED>"
    assert redacted["key"] == "<API_KEY_REDACTED>"
    assert redacted["safe"] == "hello world"
    assert redacted["nested"]["email"] == "<EMAIL_REDACTED>"

    print("Redaction tests passed.")
