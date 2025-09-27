"""Response sanitization and redaction (RSR) defense."""
from __future__ import annotations

from typing import Dict

from ..api import DefenseAdapter


class RSRDefense(DefenseAdapter):
    name = "RSR"

    def process(self, response: str, context: Dict[str, object]) -> str:
        sanitized = response
        for canary in context.get("canaries", []):
            if canary in sanitized:
                sanitized = sanitized.replace(canary, "[REDACTED]")
        return sanitized
