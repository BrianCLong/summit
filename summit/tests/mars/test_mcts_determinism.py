import pytest
from summit.mars.planner_mcts import MCTSPlanner

def test_mars_budgeted_mcts_deterministic():
    planner = MCTSPlanner(seed=42)
    plan1 = planner.plan(task_spec="Research Task", budget=100)

    planner2 = MCTSPlanner(seed=42)
    plan2 = planner2.plan(task_spec="Research Task", budget=100)

    assert plan1 == plan2
    assert "steps" in plan1
    assert len(plan1["steps"]) > 0

def test_mcts_respects_budget():
    planner = MCTSPlanner(seed=42)
    # Even if iterations are many, simulate shouldn't consume real budget from a global ledger
    # but should respect the limit during search.
    plan = planner.plan(task_spec="Limited Budget Task", budget=5)
    assert "steps" in plan
