import json
import sys
from summit.self_evolve.drift import DriftDetector

def main():
    if len(sys.argv) < 3:
        print("Usage: python self-evolving-agents-drift.py <current_metrics.json> <baseline_metrics.json>")
        sys.exit(1)

    with open(sys.argv[1], 'r') as f:
        current = json.load(f)
    with open(sys.argv[2], 'r') as f:
        baseline = json.load(f)

    detector = DriftDetector(threshold=0.05)
    if detector.detect_regression(current, baseline):
        print("REGRESSION DETECTED!")
        sys.exit(1)
    else:
        print("No regression detected.")
        sys.exit(0)

if __name__ == "__main__":
    main()
