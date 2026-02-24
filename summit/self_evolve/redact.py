import re
from typing import Dict, Any

NEVER_LOG_FIELDS = ["api_key", "token", "password", "user_email"]

def redact_data(data: Dict[str, Any]) -> Dict[str, Any]:
    redacted = data.copy()
    for field in NEVER_LOG_FIELDS:
        if field in redacted:
            redacted[field] = "[REDACTED]"

    # Recursive redaction for nested dicts
    for k, v in redacted.items():
        if isinstance(v, dict):
            redacted[k] = redact_data(v)

    return redacted
