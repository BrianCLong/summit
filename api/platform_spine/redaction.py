import re

SENSITIVE_PATTERNS = [
    r"api[-_]?key",
    r"auth(?:orization)?",
    r"password",
    r"secret",
]

def redact_text(text: str) -> str:
    if not text:
        return text
    redacted = text
    redacted = re.sub(r"(authorization[:=]\s*)bearer\s+\S+", r"\1[REDACTED]", redacted, flags=re.IGNORECASE)
    for pattern in SENSITIVE_PATTERNS:
        redacted = re.sub(f"({pattern}[:=]\s*)(?!\[REDACTED\])(\S+)", r"\1[REDACTED]", redacted, flags=re.IGNORECASE)
    return redacted

def redact_dict(data: dict) -> dict:
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
