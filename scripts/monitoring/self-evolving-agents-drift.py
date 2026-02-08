#!/usr/bin/env python3
import json
import sys
import argparse
from summit.self_evolve.drift import DriftDetector

def main():
    parser = argparse.ArgumentParser(description="Self-Evolving Agents Drift Detector")
    parser.add_argument("--baseline", required=True, help="Path to baseline metrics JSON")
    parser.add_argument("--current", required=True, help="Path to current metrics JSON")
    parser.add_argument("--output", help="Path to write drift report")

    args = parser.parse_args()

    try:
        with open(args.baseline, "r") as f:
            baseline = json.load(f)
        with open(args.current, "r") as f:
            current = json.load(f)
    except Exception as e:
        print(f"Error loading metrics: {e}")
        sys.exit(1)

    detector = DriftDetector()
    report = detector.analyze_drift(baseline, current)

    if args.output:
        with open(args.output, "w") as f:
            json.dump(report, f, indent=2)

    print(json.dumps(report, indent=2))

    if report["regression"]:
        print("REGRESSION DETECTED!")
        sys.exit(1)
    else:
        print("No significant drift detected.")
        sys.exit(0)

if __name__ == "__main__":
    main()
