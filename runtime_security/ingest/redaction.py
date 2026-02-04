from __future__ import annotations

from typing import Any, Mapping

NEVER_LOG_KEYS = {"password", "secret", "token", "api_key", "authorization"}

def redact(attrs: Mapping[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in attrs.items():
        if k.lower() in NEVER_LOG_KEYS:
            out[k] = "***REDACTED***"
        else:
            out[k] = v
    return out
