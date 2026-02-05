import re

# Simple redaction logic for PII and secrets
PII_PATTERNS = [
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email
    r'\b(?:\d{1,3}\.){3}\d{1,3}\b',                           # IP
    r'\bak_[a-zA-Z0-9]{20,}\b',                                # Generic API key pattern
]

def redact_text(text: str) -> tuple[str, list[str]]:
    redactions = []
    redacted_text = text
    for pattern in PII_PATTERNS:
        matches = re.findall(pattern, redacted_text)
        if matches:
            redactions.extend(matches)
            redacted_text = re.sub(pattern, "[REDACTED]", redacted_text)
    return redacted_text, list(set(redactions))
