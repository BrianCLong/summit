import json
import os
import sys

def detect_drift(current_metrics_file, baseline_metrics_file):
    try:
        with open(current_metrics_file, "r") as f:
            current = json.load(f)
        with open(baseline_metrics_file, "r") as f:
            baseline = json.load(f)

        if current.get("calibration_error", 0) > baseline.get("calibration_error", 0) * 1.15:
            print("ALERT: behavior_forecast_calibration_drift")
            return True

    except FileNotFoundError:
        pass
    return False

if __name__ == "__main__":
    # Typically run as a daily cron
    detect_drift(sys.argv[1], sys.argv[2])
