import re
import hashlib
from typing import Any, Dict, List

# Centralized secret redaction utility (similar to summit_harness/redaction.py)
NEVER_LOG_FIELDS = {
    "api_key", "token", "password", "secret", "credential",
    "private_key", "auth_token", "ssn", "credit_card"
}

def redact_value(key: str, value: Any) -> Any:
    if not isinstance(key, str):
        return value

    if any(field in key.lower() for field in NEVER_LOG_FIELDS):
        return "[REDACTED]"

    if isinstance(value, str):
        # Redact common patterns (email, etc.)
        value = re.sub(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", "[EMAIL_REDACTED]", value)

    return value

def redact_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    redacted = {}
    for k, v in data.items():
        if isinstance(v, dict):
            redacted[k] = redact_dict(v)
        elif isinstance(v, list):
            redacted[k] = [redact_dict(i) if isinstance(i, dict) else redact_value(k, i) for i in v]
        else:
            redacted[k] = redact_value(k, v)
    return redacted

def deterministic_hash(value: str) -> str:
    """Stable identifier within a run; not reversible."""
    return hashlib.sha256(value.encode()).hexdigest()[:16]
