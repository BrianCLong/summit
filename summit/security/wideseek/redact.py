import re

SENSITIVE_PATTERNS = [
    r'(?i)password\s*=\s*[^\s&]+',
    r'(?i)api_key\s*=\s*[^\s&]+',
    r'(?i)access_token\s*=\s*[^\s&]+',
]

def redact_text(text: str) -> str:
    """
    Redacts sensitive information from text strings (logs, traces).
    """
    if not text:
        return text

    redacted = text
    for pattern in SENSITIVE_PATTERNS:
        redacted = re.sub(pattern, '[REDACTED]', redacted)

    return redacted
