import sys
import json
from .cost import CostModel, BudgetLedger
from .planner_mcts import MCTSPlanner
from .pipeline import ModularPipeline
from .reflect import compute_diff, distill_lesson

def main():
    print("Starting MARS Run")
    cost_model = CostModel()
    ledger = BudgetLedger(100)
    planner = MCTSPlanner(cost_model)

    plan = planner.plan({"goal": "research"}, ledger)
    print(f"Plan generated with {len(plan['steps'])} steps")

    pipeline = ModularPipeline({"design": "initial"})
    tasks = pipeline.decompose()

    # Example reflection
    diff = compute_diff("solution a", "solution b")
    lesson = distill_lesson("L1", "cross_branch", "Fixed issue X", "positive")

    print("MARS Run Completed Successfully")

if __name__ == "__main__":
    main()
