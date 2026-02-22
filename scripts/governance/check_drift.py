import json
import sys
import os

def check_drift():
    artifact_path = 'artifacts/governance/branch_protection_drift.json'
    if not os.path.exists(artifact_path):
        print(f"Error: Artifact not found at {artifact_path}")
        sys.exit(1)

    try:
        with open(artifact_path, 'r') as f:
            data = json.load(f)

        if data.get('drift_detected') is True:
            print("FAILURE: Governance drift detected!")
            sys.exit(1)

        print("SUCCESS: No governance drift detected.")
        sys.exit(0)
    except Exception as e:
        print(f"Error reading artifact: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_drift()
