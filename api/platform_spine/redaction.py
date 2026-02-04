import re

# Sensitive patterns to redact (without global flags)
SENSITIVE_PATTERNS = [
    r"api[-_]?key",
    r"auth(?:orization)?",
    r"password",
    r"secret",
]

def redact_text(text: str) -> str:
    """Redact sensitive information from text."""
    if not text:
        return text

    redacted = text

    # Redact Authorization header with Bearer token
    redacted = re.sub(r"(authorization[:=]\s*)bearer\s+\S+", r"\1[REDACTED]", redacted, flags=re.IGNORECASE)

    # Redact key-value pairs like "api_key: secret"
    for pattern in SENSITIVE_PATTERNS:
        # Use re.IGNORECASE
        # Ensure we don't double redact if already redacted
        redacted = re.sub(f"({pattern}[:=]\\s*)(?!\\[REDACTED\\])(\\S+)", r"\1[REDACTED]", redacted, flags=re.IGNORECASE)

    # Redact standalone Bearer tokens
    redacted = re.sub(r"(bearer\s+)(?!\\[REDACTED\\])(\S+)", r"\1[REDACTED]", redacted, flags=re.IGNORECASE)

    return redacted

def redact_dict(data: dict) -> dict:
    """Recursively redact sensitive keys from a dictionary."""
    if not isinstance(data, dict):
        return data

    redacted = {}
    for k, v in data.items():
        if any(re.search(pattern, k, flags=re.IGNORECASE) for pattern in SENSITIVE_PATTERNS) or k.lower() == "authorization":
            redacted[k] = "[REDACTED]"
        elif isinstance(v, dict):
            redacted[k] = redact_dict(v)
        elif isinstance(v, list):
            redacted[k] = [redact_dict(item) if isinstance(item, dict) else item for item in v]
        else:
            redacted[k] = v

    return redacted
