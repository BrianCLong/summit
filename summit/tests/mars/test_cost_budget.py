import pytest
from summit.mars.cost import CostModel, TaskType
from summit.mars.ledger import BudgetLedger

def test_mars_cost_budget_enforced():
    cost_model = CostModel()
    ledger = BudgetLedger(budget_limit=100)

    # Valid task
    cost = cost_model.get_cost(TaskType.DESIGN)
    ledger.record("task-1", TaskType.DESIGN, cost)

    assert ledger.total_spent == 10

    # Task that exceeds budget
    huge_cost = 200
    with pytest.raises(ValueError, match="Budget exceeded"):
        ledger.record("task-2", TaskType.IMPLEMENT, huge_cost)

def test_cost_model_defaults():
    cost_model = CostModel()
    assert cost_model.get_cost(TaskType.DESIGN) == 10
    assert cost_model.get_cost(TaskType.DECOMPOSE) == 5
    assert cost_model.get_cost(TaskType.IMPLEMENT) == 20
    assert cost_model.get_cost(TaskType.EVALUATE) == 50
