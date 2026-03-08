import re


def redact_sensitive(text: str) -> str:
    # Redact common token patterns (e.g., Bearer tokens, cookies)
    text = re.sub(r"Bearer\s+[a-zA-Z0-9\._\-]+", "Bearer [REDACTED]", text)
    text = re.sub(
        r"cookie:\s+[a-zA-Z0-9\._\-;=\s]+", "cookie: [REDACTED]", text, flags=re.IGNORECASE
    )
    return text
