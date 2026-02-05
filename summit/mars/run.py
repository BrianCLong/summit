import argparse
import json
import os
from pathlib import Path
from summit.mars.planner_mcts import MCTSPlanner
from summit.mars.ledger import Ledger, Budget
from summit.mars.pipeline import MARSPipeline
from summit.mars.reflect import ReflectionEngine

def main():
    parser = argparse.ArgumentParser(description="MARS Runner")
    parser.add_argument("--dry-run", action="store_true", help="Run without external side effects")
    parser.add_argument("--budget", type=float, default=10.0, help="Cost unit budget")
    parser.add_argument("--evidence-id", type=str, default="EVID-MARS-AUTO1", help="Evidence ID")
    args = parser.parse_args()

    # Normalize evidence_id for schema matching
    evidence_id = args.evidence_id.upper()

    print(f"MARS Runner started. Evidence ID: {evidence_id}, Budget: {args.budget}")

    if args.dry_run:
        print("Executing dry run...")

        # 1. Planning
        planner = MCTSPlanner(evidence_id, args.budget)
        plan = planner.plan(iterations=10)

        # 2. Ledger
        budget = Budget(total_limit=args.budget)
        ledger = Ledger(evidence_id, budget)
        ledger.record_cost("planner", 1.0, "Planning phase", "ref_plan")

        # 3. Pipeline
        pipeline = MARSPipeline(evidence_id)
        pipeline.construct("Dry run AI research")

        # 4. Reflection (mock)
        engine = ReflectionEngine(evidence_id)
        lesson = engine.distill_lesson("Initial", "Improved", 0.5, 0.7)
        lessons_art = engine.generate_lessons_artifact([lesson])

        # 5. Save Artifacts (Use evidence/ directory)
        out_dir = Path("evidence") / evidence_id
        out_dir.mkdir(parents=True, exist_ok=True)

        with open(out_dir / "plan.json", "w") as f:
            json.dump(plan, f, indent=2, sort_keys=True)
        with open(out_dir / "ledger.json", "w") as f:
            json.dump(ledger.to_dict(), f, indent=2, sort_keys=True)
        with open(out_dir / "lessons.json", "w") as f:
            json.dump(lessons_art, f, indent=2, sort_keys=True)

        # Dummy stamp and metrics
        with open(out_dir / "stamp.json", "w") as f:
            json.dump({"generated_at": "2026-02-02T12:00:00Z", "git_sha": "unknown"}, f, indent=2)
        with open(out_dir / "metrics.json", "w") as f:
            json.dump({"total_cost": ledger.budget.total_consumed, "status": "success"}, f, indent=2)

        print(f"Dry run complete. Artifacts saved to {out_dir}")
    else:
        print("Real execution not implemented in this version.")

if __name__ == "__main__":
    main()
