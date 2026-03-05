import pytest

from agents.tools.budgets import BudgetExceededError, StepBudget
from agents.tools.runner import ToolRunner


def test_budget_enforced() -> None:
    runner = ToolRunner(StepBudget(max_steps=1))
    with pytest.raises(BudgetExceededError):
        runner.execute(["echo one", "echo two"])
