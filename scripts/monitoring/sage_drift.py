import sys
import json
import os

def check_drift(metrics_path, threshold=0.1):
    """
    Checks if mixed_outcome_rate is below threshold, indicating advantage collapse
    despite SAGE being enabled.
    """
    if not os.path.exists(metrics_path):
        print(f"Metrics file not found: {metrics_path}")
        return 1

    try:
        with open(metrics_path, 'r') as f:
            data = json.load(f)

        # Check mixed outcome rate
        rate = data.get("mixed_outcome_rate", 0.0)
        if rate < threshold:
            print(f"DRIFT DETECTED: Mixed outcome rate {rate} is below threshold {threshold}.")
            return 1

        print(f"Status OK: Mixed outcome rate {rate} >= {threshold}")
        return 0
    except Exception as e:
        print(f"Error reading metrics: {e}")
        return 1

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python sage_drift.py <metrics.json> [threshold]")
        sys.exit(1)

    path = sys.argv[1]
    thresh = float(sys.argv[2]) if len(sys.argv) > 2 else 0.1

    sys.exit(check_drift(path, thresh))
