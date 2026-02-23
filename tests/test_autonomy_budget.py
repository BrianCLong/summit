import pytest

from summit.policy.autonomy import AutonomyBudget, enforce_budget


def test_autonomy_budget_within_limits() -> None:
  budget = AutonomyBudget(max_steps=3, max_tool_calls=2, max_messages=4)
  enforce_budget(step=3, tool_calls=2, messages=4, budget=budget)


def test_autonomy_budget_exceeds_steps() -> None:
  budget = AutonomyBudget(max_steps=1, max_tool_calls=2, max_messages=3)
  with pytest.raises(RuntimeError, match="steps"):
    enforce_budget(step=2, tool_calls=1, messages=1, budget=budget)
