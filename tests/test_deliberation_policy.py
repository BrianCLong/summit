import pytest
from summit.agents.deliberation import DeliberationBudget, BudgetExceeded, estimate_difficulty, allocate_budget
from summit.agents.policies import AdaptiveDeliberationPolicy

def test_deliberation_budget_consumption():
    budget = DeliberationBudget(max_units=10)
    budget = budget.consume(5)
    assert budget.used_units == 5

    with pytest.raises(BudgetExceeded):
        budget.consume(6)

def test_estimate_difficulty():
    signals_easy = {"tool_errors": False}
    assert estimate_difficulty(signals_easy) == 0.0

    signals_hard = {"multi_file": True, "test_failures": 2, "tool_errors": True}
    # 1.0 (multi) + 2.0 (tests) + 1.0 (tool) = 4.0
    assert estimate_difficulty(signals_hard) == 4.0

def test_allocate_budget():
    base = 10
    cap = 50

    # Easy: score 0 -> 10 units
    assert allocate_budget(base, 0.0, cap) == 10

    # Hard: score 4.0 -> 10 * (1+4) = 50 units
    assert allocate_budget(base, 4.0, cap) == 50

    # Very Hard: score 10.0 -> 10 * 11 = 110 -> cap at 50
    assert allocate_budget(base, 10.0, cap) == 50

def test_policy_application():
    policy = AdaptiveDeliberationPolicy(base_budget=10, max_budget=100)
    state = {"signals": {"multi_file": True}} # score 1.0 -> 20 units

    result = policy.apply(state)
    assert result["budget_allocated"] == 20
    assert isinstance(result["deliberation_budget"], DeliberationBudget)
    assert result["deliberation_budget"].max_units == 20
