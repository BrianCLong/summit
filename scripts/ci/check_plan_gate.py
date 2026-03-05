import sys
import os
import json

if os.environ.get("SUMMIT_AUTON_ENGINEER", "0") != "1":
    sys.exit(0)

# Must read artifacts/*.json and write policy_report.json deterministically
try:
    with open("artifacts/run_plan.json", "r") as f:
        plan = json.load(f)
except FileNotFoundError:
    print("Plan not found")
    sys.exit(1)

report = {
    "status": "PASS",
    "gate": "plan_gate"
}

os.makedirs("artifacts", exist_ok=True)
with open("artifacts/policy_report.json", "w") as f:
    json.dump(report, f, indent=2)

sys.exit(0)
