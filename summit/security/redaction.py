from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable

from .pii import PIIRedactor

DEFAULT_NEVER_LOG_KEYS = {
    "prompt",
    "response",
    "api_key",
    "authorization",
    "token",
    "user_id",
    "email",
}


@dataclass(frozen=True)
class RedactionResult:
    record: dict[str, Any]
    redacted_fields: int


def redact_record(
    record: dict[str, Any],
    *,
    never_log_keys: Iterable[str] = DEFAULT_NEVER_LOG_KEYS,
    additional_patterns: list[str] | None = None,
) -> RedactionResult:
    redactor = PIIRedactor(additional_patterns=additional_patterns or [])
    never_log_set = set(never_log_keys)
    redacted_fields = 0

    def _redact(value: Any, key: str | None = None) -> Any:
        nonlocal redacted_fields
        if key is not None and key in never_log_set:
            redacted_fields += 1
            return "[REDACTED]"
        if isinstance(value, dict):
            return {k: _redact(v, k) for k, v in value.items()}
        if isinstance(value, list):
            return [_redact(item, None) for item in value]
        if isinstance(value, str):
            redacted = redactor.redact_text(value)
            if redacted != value:
                redacted_fields += 1
            return redacted
        return value

    return RedactionResult(record=_redact(record), redacted_fields=redacted_fields)
