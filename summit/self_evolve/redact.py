from typing import Dict, Any, List

NEVER_LOG_FIELDS = {"api_key", "password", "token", "auth_token", "secret"}

def redact_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    redacted = {}
    for k, v in data.items():
        if k in NEVER_LOG_FIELDS:
            redacted[k] = "[REDACTED]"
        elif k == "user_email":
            redacted[k] = "[EMAIL_REDACTED]"
        elif isinstance(v, dict):
            redacted[k] = redact_dict(v)
        elif isinstance(v, list):
            redacted[k] = [redact_dict(i) if isinstance(i, dict) else i for i in v]
        else:
            redacted[k] = v
    return redacted
