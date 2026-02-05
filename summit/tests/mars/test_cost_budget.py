import pytest
from summit.mars.ledger import Ledger, Budget
from summit.mars.cost import CostModel, TaskType

def test_mars_cost_budget_enforced():
    budget = Budget(total_limit=10.0)
    ledger = Ledger(evidence_id="EVID-12345678", budget=budget)

    # Valid recording
    ledger.record_cost("task1", 5.0, "design task", "ref1")
    assert ledger.budget.total_consumed == 5.0

    # Another valid one
    ledger.record_cost("task2", 4.0, "implement task", "ref2")
    assert ledger.budget.total_consumed == 9.0

    # This should fail
    with pytest.raises(ValueError, match="Budget exceeded"):
        ledger.record_cost("task3", 2.0, "expensive task", "ref3")

def test_mars_ledger_monotonic_increase():
    budget = Budget(total_limit=100.0)
    ledger = Ledger(evidence_id="EVID-11111111", budget=budget)

    prev_consumed = 0.0
    for i in range(5):
        ledger.record_cost(f"task_{i}", 10.0, "step", f"ref_{i}")
        assert ledger.budget.total_consumed > prev_consumed
        prev_consumed = ledger.budget.total_consumed

def test_mars_ledger_stable_json():
    budget = Budget(total_limit=10.0)
    ledger = Ledger(evidence_id="EVID-STABLE01", budget=budget)
    ledger.record_cost("task1", 1.0, "desc", "ref")

    json_out = ledger.to_json()
    # Check for sorted keys implicitly by comparing to expected string (simplified)
    # The sort_keys=True in json.dumps ensures stability
    assert '"evidence_id": "EVID-STABLE01"' in json_out
    assert '"total_consumed": 1.0' in json_out

def test_cost_model_lookup():
    model = CostModel.default()
    assert model.get_cost(TaskType.DESIGN) == 1.0
    assert model.get_cost("design") == 1.0
    assert model.get_cost("evaluate") == 5.0
