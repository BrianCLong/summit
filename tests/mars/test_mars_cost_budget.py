import pytest
from summit.mars.cost import CostModel, BudgetLedger, TaskType

def test_mars_cost_model():
    model = CostModel()
    assert model.get_cost(TaskType.DESIGN) == 10
    assert model.get_cost(TaskType.EVALUATE) == 50

def test_mars_budget_ledger_enforced():
    ledger = BudgetLedger(30)
    ledger.record("T1", TaskType.DESIGN, 10)
    ledger.record("T2", TaskType.IMPLEMENT, 20)

    with pytest.raises(ValueError, match="Budget exceeded"):
        ledger.record("T3", TaskType.DESIGN, 10)

def test_mars_ledger_running_total():
    ledger = BudgetLedger(100)
    ledger.record("T1", TaskType.DESIGN, 10)
    assert ledger.total_spent == 10
    ledger.record("T2", TaskType.DECOMPOSE, 5)
    assert ledger.total_spent == 15
    assert len(ledger.entries) == 2
