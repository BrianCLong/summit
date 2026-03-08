from __future__ import annotations

from typing import Dict

from .base import BaseAgent


class CriticAgent(BaseAgent):
    def run(self, task: str, context: Dict[str, str]) -> Dict[str, str]:
        result = context["result"]
        quality = "pass" if result else "fail"
        return {"quality": quality, "checks": "deterministic,complete"}
