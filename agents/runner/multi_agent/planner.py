from __future__ import annotations

from typing import Dict

from .base import BaseAgent


class PlannerAgent(BaseAgent):
    def run(self, task: str, context: Dict[str, str]) -> Dict[str, str]:
        normalized = " ".join(task.strip().lower().split())
        return {
            "plan": f"analyze:{normalized};execute:{normalized};review:{normalized}",
            "task_fingerprint": str(len(normalized)),
        }
