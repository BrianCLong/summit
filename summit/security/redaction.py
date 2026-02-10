import re
from typing import Any

SENSITIVE_PATTERNS = [
    re.compile(r"sk-[a-zA-Z0-9]{20,}"), # OpenAI-like keys
    re.compile(r"ghp_[a-zA-Z0-9]{20,}"), # GitHub tokens
    re.compile(r"-----BEGIN PRIVATE KEY-----.*-----END PRIVATE KEY-----", re.DOTALL),
]

def redact_text(text: str) -> str:
    redacted = text
    for pattern in SENSITIVE_PATTERNS:
        redacted = pattern.sub("[REDACTED]", redacted)
    return redacted

def redact_structure(data: Any) -> Any:
    if isinstance(data, str):
        return redact_text(data)
    elif isinstance(data, list):
        return [redact_structure(item) for item in data]
    elif isinstance(data, dict):
        return {k: redact_structure(v) for k, v in data.items()}
    return data
