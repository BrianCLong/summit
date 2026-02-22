import pytest
import json
from summit.mars.planner_mcts import MCTSPlanner
from summit.mars.cost import CostModel

def test_mars_budgeted_mcts_deterministic():
    model = CostModel()
    planner1 = MCTSPlanner(model, iterations=50, seed=42)
    planner2 = MCTSPlanner(model, iterations=50, seed=42)

    plan1 = planner1.plan("Deterministic Test", 100)
    plan2 = planner2.plan("Deterministic Test", 100)

    # Ensure plans are identical with same seed
    assert json.dumps(plan1, sort_keys=True) == json.dumps(plan2, sort_keys=True)
    assert plan1["seed"] == 42
    assert len(plan1["steps"]) > 0

def test_mars_mcts_respects_budget():
    model = CostModel()
    # Very small budget
    planner = MCTSPlanner(model, iterations=100, seed=42)
    plan = planner.plan("Budget Test", 15)

    for step in plan["steps"]:
        assert step["cumulative_cost"] <= 15
