from __future__ import annotations

from typing import Any, Dict

NEVER_LOG_KEYS = {"audio", "context"}


def redact_for_logs(payload: Dict[str, Any]) -> Dict[str, Any]:
    redacted = dict(payload)
    for key in NEVER_LOG_KEYS:
        if key in redacted and redacted[key] is not None:
            redacted[key] = "<redacted>"
    return redacted
