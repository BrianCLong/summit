import re
from typing import Set

NEVER_LOG_FIELDS: Set[str] = {
    "api_key", "token", "password", "secret", "cookie", "authorization", "bearer"
}

def redact_secrets(text: str) -> str:
    """
    Redacts common secrets from text based on NEVER_LOG_FIELDS.
    """
    for field in NEVER_LOG_FIELDS:
        # Match key=value (case-insensitive)
        text = re.sub(rf'({field})\s*=\s*[^\s,]+', rf'\1=[REDACTED]', text, flags=re.IGNORECASE)
        # Match "key": "value" (case-insensitive)
        text = re.sub(rf'"{field}"\s*:\s*"[^"]+"', rf'"{field}": "[REDACTED]"', text, flags=re.IGNORECASE)
    return text

def is_field_sensitive(field_name: str) -> bool:
    """
    Checks if a field name is considered sensitive.
    """
    return field_name.lower() in NEVER_LOG_FIELDS
