#!/usr/bin/env python3
import json
import os
import sys


def check_drift():
    # Mock drift detection
    evidence_dir = "evidence/aeip"

    if not os.path.exists(evidence_dir):
        print(f"No evidence directory found at {evidence_dir}")
        return

    for item in os.listdir(evidence_dir):
        # Allow meta reports
        if item in ["performance.json", "drift_report.json"]:
            continue

        if not item.startswith("AEIP-"):
            print(f"Drift Detected: Invalid evidence schema directory '{item}'")
            sys.exit(1)

    print("No schema drift detected.")

    # Write a drift report
    report = {
        "status": "healthy",
        "drift_detected": False
    }

    with open("evidence/aeip/drift_report.json", "w") as f:
        json.dump(report, f)

if __name__ == "__main__":
    check_drift()
