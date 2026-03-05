import argparse
import hashlib
import json
import os
import sys


def detect_drift(current_report_path, new_report_path):
    with open(current_report_path) as f:
        current = json.load(f)
    with open(new_report_path) as f:
        new = json.load(f)

    current_hash = hashlib.sha256(json.dumps(current, sort_keys=True).encode()).hexdigest()
    new_hash = hashlib.sha256(json.dumps(new, sort_keys=True).encode()).hexdigest()

    if current_hash != new_hash:
        print(f"Drift detected! Current: {current_hash}, New: {new_hash}")
        # Simplistic drift report
        return {"drift": True, "details": "Hashes do not match."}
    return {"drift": False, "details": "No drift."}

def main():
    parser = argparse.ArgumentParser(description="Media List Drift Detection")
    parser.add_argument("--current", type=str, required=True, help="Path to current report.json")
    parser.add_argument("--new", type=str, required=True, help="Path to newly generated report.json")
    parser.add_argument("--output", type=str, required=True, help="Path to output trend.json")
    args = parser.parse_args()

    if not os.path.exists(args.current):
        print("No current report exists. Initial run.", file=sys.stderr)
        drift_result = {"drift": False, "details": "Initial run"}
    else:
        drift_result = detect_drift(args.current, args.new)

    with open(args.output, "w") as f:
        json.dump(drift_result, f, indent=2, sort_keys=True)

    if drift_result.get("drift"):
        sys.exit(1) # Fail CI if drift detected for weekly monitoring

if __name__ == "__main__":
    main()
