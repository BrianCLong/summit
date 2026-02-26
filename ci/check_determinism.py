import json
import re
import sys
import os

def check_no_timestamps(data):
    """Recursively checks for timestamp patterns in a dictionary."""
    pattern = r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}"

    if isinstance(data, str):
        if re.search(pattern, data):
            return True
    elif isinstance(data, dict):
        for value in data.values():
            if check_no_timestamps(value):
                return True
    elif isinstance(data, list):
        for item in data:
            if check_no_timestamps(item):
                return True
    return False

def main():
    artifact_files = ["artifacts/report.json", "artifacts/metrics.json", "artifacts/stamp.json"]

    success = True
    for artifact_file in artifact_files:
        if not os.path.exists(artifact_file):
            print(f"FAILED: Artifact {artifact_file} not found.")
            success = False
            continue

        with open(artifact_file, "r") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                print(f"FAILED: {artifact_file} is not a valid JSON.")
                success = False
                continue

        if check_no_timestamps(data):
            print(f"FAILED: {artifact_file} contains an unstable timestamp.")
            success = False
        else:
            print(f"PASSED: {artifact_file} is deterministic.")

    if not success:
        sys.exit(1)

    print("\nAll orchestrator artifacts verified for determinism.")

if __name__ == "__main__":
    main()
