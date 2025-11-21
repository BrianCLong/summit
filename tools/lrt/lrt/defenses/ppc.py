"""Prompt pattern classifier (PPC) defense."""
from __future__ import annotations

from typing import Dict

from ..api import DefenseAdapter


class PPCDefense(DefenseAdapter):
    name = "PPC"

    def __init__(self, banned_keywords: set[str] | None = None) -> None:
        self._banned = {"leak", "ignore safeguards", "canary"}
        if banned_keywords:
            self._banned.update(keyword.lower() for keyword in banned_keywords)

    def process(self, response: str, context: Dict[str, object]) -> str:
        prompt = str(context.get("prompt", "")).lower()
        if any(keyword in prompt for keyword in self._banned):
            return "Request blocked due to policy violation."
        return response
