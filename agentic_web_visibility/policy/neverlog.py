from typing import Any, Dict, List

NEVER_LOG_FIELDS = ["password", "token", "secret", "authorization", "cookie", "raw_prompt"]

def audit_event(event: dict[str, Any]) -> bool:
    """
    Returns True if the event is safe to log, False if it contains forbidden fields.
    """
    return _check_recursive(event)

def _check_recursive(data: Any) -> bool:
    if isinstance(data, dict):
        for key, value in data.items():
            if key.lower() in NEVER_LOG_FIELDS:
                return False
            if not _check_recursive(value):
                return False
    elif isinstance(data, list):
        for item in data:
            if not _check_recursive(item):
                return False
    return True
