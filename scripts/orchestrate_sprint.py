#!/usr/bin/env python3
import json
import os
import hashlib
from datetime import datetime

# Prompt definitions
PROMPTS = [
    {
        "id": "A1",
        "title": "Minimal Training Stack v0.1",
        "agent": "Codex",
        "role": "Model Trainer",
        "priority": "High",
        "tasks": [
            "Create ml/train.py",
            "Create ml/config/train.classifier.yaml",
            "Create ml/data/sample/train.classifier.sample.jsonl",
            "Update Makefile",
            "Create docs/ml/training-classifier.md",
        ],
    },
    {
        "id": "A2",
        "title": "Eval Harness & Leaderboard",
        "agent": "Codex",
        "role": "Model Trainer",
        "priority": "High",
        "tasks": [
            "Create ml/eval.py",
            "Create reports/models/classifier/leaderboard.md",
            "Create .github/workflows/ci-train-eval-smoke.yml",
            "Update Makefile",
        ],
    },
    {
        "id": "B1",
        "title": "IntelGraph Schema v1",
        "agent": "Jules",
        "role": "Maestro Engineer",
        "priority": "High",
        "tasks": [
            "Create server/src/intelgraph/schema.ts",
            "Create server/src/examples/ig_seed_graph.ts",
            "Create docs/intelgraph/schema-v1.md",
            "Create server/src/intelgraph/schema.test.ts",
        ],
    },
    {
        "id": "B2",
        "title": "Maestro Plan -> Execute -> Log Pipeline",
        "agent": "Jules",
        "role": "Maestro Engineer",
        "priority": "High",
        "tasks": [
            "Create server/src/maestro/core.ts",
            "Create server/src/maestro/cost_meter.ts",
            "Create server/src/scripts/maestro-run.ts",
            "Create server/src/maestro/core.test.ts",
        ],
    },
    {
        "id": "C1",
        "title": "Green Baseline CI & Merge Train",
        "agent": "Claude",
        "role": "CI Guardian",
        "priority": "High",
        "tasks": [
            "Create .github/workflows/ci-green-baseline.yml",
            "Create scripts/ci/merge_train_manager.sh",
            "Create .github/workflows/fast-lane-check.yml",
            "Create docs/engineering/ci-baseline.md",
        ],
    },
    {
        "id": "C3",
        "title": "CI Observability & Weekly Report",
        "agent": "Claude",
        "role": "DevOps Engineer",
        "priority": "Medium",
        "tasks": [
            "Create scripts/ci/generate_weekly_report.py",
            "Create .github/workflows/ci-report-generator.yml",
        ],
    },
    {
        "id": "D1",
        "title": "Maestro Run Console UI",
        "agent": "Gemini",
        "role": "UI/UX Engineer",
        "priority": "Medium",
        "tasks": [
            "Create apps/web/src/pages/MaestroRunConsole.tsx",
            "Create apps/web/src/api/maestro.ts",
            "Create docs/ui/maestro-run-console.md",
        ],
    },
    {
        "id": "E1",
        "title": "Onboarding & Role Registry",
        "agent": "Claude",
        "role": "Docs Engineer",
        "priority": "Low",
        "tasks": [
            "Create docs/contributing/quickstart.md",
            "Create docs/agents/roles.md",
            "Create docs/INDEX.md",
        ],
    },
]

def generate_plan_id():
    # Generate a period ID based on the current ISO calendar week
    now = datetime.now()
    year, week, _ = now.isocalendar()
    return f"{year}-W{week:02d}"

def calculate_hash(data):
    return hashlib.sha256(json.dumps(data, sort_keys=True).encode("utf-8")).hexdigest()

def main():
    print("--- Multi-Agent Sprint Orchestrator ---")
    timestamp = datetime.now().isoformat()
    print(f"Timestamp: {timestamp}\n")

    plan_id = generate_plan_id()

    # Calculate hashes (mocked for source files as they are hardcoded here)
    prompts_hash = calculate_hash(PROMPTS)

    # Construct the plan object
    plan_artifact = {
        "plan_id": plan_id,
        "timestamp": timestamp,
        "policy_hashes": {
            "scoring_policy": "mock-scoring-hash",
            "planning_policy": "mock-planning-hash"
        },
        "source_artifact_hashes": {
            "governance_score": "mock-score-hash",
            "triage": "mock-triage-hash",
            "exceptions": "mock-exceptions-hash",
            "prompts_hash": prompts_hash
        },
        "items": PROMPTS
    }

    # Ensure output directory exists
    output_dir = f"dist/sprint-plans/{plan_id}"
    os.makedirs(output_dir, exist_ok=True)

    output_file = os.path.join(output_dir, "plans.json")
    with open(output_file, "w") as f:
        json.dump(plan_artifact, f, indent=2)

    for prompt in PROMPTS:
        print(
            f"[{prompt['id']}] Assigning '{prompt['title']}' to {prompt['agent']} ({prompt['role']})..."
        )
        print("    Tasks:")
        for task in prompt["tasks"]:
            print(f"    - {task}")
        print("    Status: PENDING_EXECUTION")
        print("-" * 40)

    print(f"\nPlan artifact generated at: {output_file}")
    print("\nOrchestration complete. Agents notified.")

    # In a real system, this would trigger webhooks or queue jobs.
    # Here we just output the plan.


if __name__ == "__main__":
    main()
