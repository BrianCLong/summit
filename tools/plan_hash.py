import sys
import json
import os

# Add root directory to path to import telemetry
sys.path.append(os.getcwd())

from telemetry.plan_sampler import PlanSampler

def main():
    if len(sys.argv) < 2:
        print("Usage: python tools/plan_hash.py <plan_json_file>")
        sys.exit(1)

    plan_file = sys.argv[1]
    if not os.path.exists(plan_file):
        print(f"Error: File {plan_file} not found")
        sys.exit(1)

    with open(plan_file, "r") as f:
        try:
            plan = json.load(f)
        except json.JSONDecodeError:
            print(f"Error: Invalid JSON in {plan_file}")
            sys.exit(1)

    sampler = PlanSampler()
    fingerprint = sampler.get_plan_fingerprint(plan)

    print(fingerprint)

if __name__ == "__main__":
    main()
