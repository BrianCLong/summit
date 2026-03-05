from dataclasses import dataclass


@dataclass(frozen=True)
class StepBudget:
    max_steps: int = 40


class BudgetExceededError(RuntimeError):
    pass
