"""Content consistency check (CCC) defense."""

from __future__ import annotations

from ..api import DefenseAdapter


class CCCDefense(DefenseAdapter):
    name = "CCC"

    def process(self, response: str, context: dict[str, object]) -> str:
        metadata = context.get("metadata") or {}
        if metadata.get("step") is not None and metadata["step"] > 1:
            return "Escalation review required."
        if "quote it" in str(context.get("prompt", "")).lower():
            return "Unable to comply with quoting request."
        return response
