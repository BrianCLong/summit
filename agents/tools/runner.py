from typing import Iterable, List

from .budgets import BudgetExceededError, StepBudget


class ToolRunner:
    def __init__(self, budget: StepBudget) -> None:
        self.budget = budget

    def execute(self, commands: Iterable[str]) -> List[dict]:
        logs: List[dict] = []
        for index, command in enumerate(commands, start=1):
            if index > self.budget.max_steps:
                raise BudgetExceededError(
                    f"tool budget exceeded: {index} > {self.budget.max_steps}"
                )
            logs.append({"step": index, "command": command, "status": "ok"})
        return logs
