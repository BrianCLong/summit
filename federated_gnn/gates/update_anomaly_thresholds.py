import json
import os
import sys


def check_anomaly(update_path: str, thresholds_path: str) -> bool:
    try:
        with open(update_path) as f:
            envelope = json.load(f)

        # Check if envelope has gradient_stats
        stats = envelope.get("gradient_stats", {})
        l2_norm = stats.get("l2_norm", 0.0)

        with open(thresholds_path) as f:
            thresholds = json.load(f)

        max_norm = thresholds.get("max_l2_norm", 10.0)

        if l2_norm > max_norm:
            print(f"Anomaly detected: L2 norm {l2_norm} > {max_norm}")
            return False

        print(f"Update within thresholds. L2 norm {l2_norm}")
        return True
    except Exception as e:
        print(f"Error checking anomaly: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: update_anomaly_thresholds.py <envelope_json> <thresholds_json>")
        sys.exit(1)

    if not check_anomaly(sys.argv[1], sys.argv[2]):
        sys.exit(1)
    sys.exit(0)
