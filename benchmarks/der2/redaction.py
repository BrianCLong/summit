from __future__ import annotations

from typing import Any

REDACTED_TEXT = "[REDACTED_DOCUMENT_TEXT]"


def redact_record(record: dict[str, Any]) -> dict[str, Any]:
    redacted = {}
    for key, value in record.items():
        if key in {"doc_text", "document_text", "text"}:
            redacted[key] = REDACTED_TEXT
        elif isinstance(value, dict):
            redacted[key] = redact_record(value)
        else:
            redacted[key] = value
    return redacted
