import json
import os
import sys


def check_drift(bundle_path, baseline_path):
    if not os.path.exists(bundle_path) or not os.path.exists(baseline_path):
        print("Missing bundle or baseline for drift check.")
        return

    with open(bundle_path) as f:
        bundle = json.load(f)
    with open(baseline_path) as f:
        baseline = json.load(f)

    # Simple drift detection: check if requirement count decreased
    if bundle['metrics']['requirement_count'] < baseline['metrics']['requirement_count']:
        print(f"Drift detected: Requirement count decreased from {baseline['metrics']['requirement_count']} to {bundle['metrics']['requirement_count']}")
    else:
        print("No drift detected in requirement count.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 maestro_spec-drift.py <bundle_path> <baseline_path>")
        sys.exit(1)
    check_drift(sys.argv[1], sys.argv[2])
