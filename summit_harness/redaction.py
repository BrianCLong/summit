from intelgraph.governance.redaction import redact_text as redact_pii
import re

NEVER_LOG_KEYS = ["api_key", "token", "password", "secret"]

def redact_dict(data: dict) -> dict:
    redacted = {}
    for k, v in data.items():
        if any(key in k.lower() for key in NEVER_LOG_KEYS):
            redacted[k] = "[REDACTED]"
        elif isinstance(v, dict):
            redacted[k] = redact_dict(v)
        else:
            redacted[k] = v
    return redacted

def redact_text(text: str) -> str:
    # 1. Apply standard PII redaction
    text = redact_pii(text)

    # 2. Apply subagent specific redactions (e.g. API keys)
    text = re.sub(r'sk-[a-zA-Z0-9]{20,}', '[REDACTED_API_KEY]', text)

    return text
