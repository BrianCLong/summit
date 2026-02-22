import json
import sys
import os

# Thresholds
PASS_RATE_THRESHOLD = 0.95
MAX_BUDGET_EXCEED_RATE = 0.05

def check_drift(metrics_path):
    if not os.path.exists(metrics_path):
        print(f"Metrics file not found: {metrics_path}")
        return False

    with open(metrics_path, "r") as f:
        metrics = json.load(f)

    pass_rate = metrics.get("pass_rate", 0.0)
    if pass_rate < PASS_RATE_THRESHOLD:
        print(f"Drift detected: Pass rate {pass_rate} < {PASS_RATE_THRESHOLD}")
        return True

    return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python composer-1-5-drift.py <metrics.json>")
        sys.exit(1)

    drift = check_drift(sys.argv[1])
    if drift:
        sys.exit(1)
    print("No drift detected.")
    sys.exit(0)
