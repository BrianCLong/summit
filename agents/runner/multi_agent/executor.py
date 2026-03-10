from __future__ import annotations

from typing import Dict

from .base import BaseAgent


class ExecutorAgent(BaseAgent):
    def run(self, task: str, context: Dict[str, str]) -> Dict[str, str]:
        plan = context["plan"]
        result = f"executed:{plan}:{task.strip().lower()}"
        return {"result": result, "result_size": str(len(result))}
