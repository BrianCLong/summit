#!/usr/bin/env python3
# scripts/monitoring/sam-drift.py
# Summit original clean-room implementation

import argparse
import json
import sys
from pathlib import Path

def check_drift(report_path: Path, threshold: float = 0.05):
    """
    Check for sharpness drift in the provided report.
    """
    if not report_path.exists():
        print(f"Error: Report file not found: {report_path}")
        sys.exit(1)

    with open(report_path) as f:
        report = json.load(f)

    sharpness = report.get("sharpness", 0.0)
    rho = report.get("rho", 0.0)

    print(f"Current Sharpness: {sharpness:.4f} (rho={rho})")

    # Simple alert logic
    if sharpness > threshold:
        print(f"ALERT: Sharpness regression detected! {sharpness:.4f} > {threshold:.4f}")
        return True

    print("Sharpness within acceptable limits.")
    return False

def main():
    parser = argparse.ArgumentParser(description="Monitor SAM sharpness drift")
    parser.add_argument("--report", type=str, default="sharpness_report.json", help="Path to sharpness report")
    parser.add_argument("--threshold", type=float, default=0.05, help="Sharpness alert threshold")

    args = parser.parse_args()

    drift_detected = check_drift(Path(args.report), args.threshold)

    # Exit with code 1 if drift detected to fail CI
    if drift_detected:
        sys.exit(1)

if __name__ == "__main__":
    main()
