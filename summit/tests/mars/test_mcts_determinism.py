import pytest
import json
from summit.mars.planner_mcts import MCTSPlanner

def test_mars_budgeted_mcts_deterministic():
    evidence_id = "EVID-PLAN0001"
    budget = 10.0
    seed = 42

    planner1 = MCTSPlanner(evidence_id, budget, seed=seed)
    plan1 = planner1.plan(iterations=50)

    planner2 = MCTSPlanner(evidence_id, budget, seed=seed)
    plan2 = planner2.plan(iterations=50)

    assert plan1 == plan2
    # Canonical JSON check
    assert json.dumps(plan1, sort_keys=True) == json.dumps(plan2, sort_keys=True)

def test_mars_mcts_budget_aware():
    evidence_id = "EVID-PLAN0002"
    budget = 2.0 # Very small budget
    planner = MCTSPlanner(evidence_id, budget)
    plan = planner.plan(iterations=50)

    # Check that total cost doesn't exceed budget
    from summit.mars.cost import CostModel
    cost_model = CostModel.default()
    total_cost = 0.0
    for task in plan["tasks"]:
        total_cost += cost_model.get_cost(task["type"])

    assert total_cost <= budget
    assert total_cost > 0 # Should have done something

def test_mars_mcts_different_seeds():
    # Placeholder for checking that seeds affect something if randomness was involved
    pass
