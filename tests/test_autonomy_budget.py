import pytest
from summit.policy.autonomy import enforce_budget, AutonomyBudget

def test_budget_denies_by_default():
  with pytest.raises(RuntimeError):
    enforce_budget(step=21, tool_calls=0, messages=0, budget=AutonomyBudget())
