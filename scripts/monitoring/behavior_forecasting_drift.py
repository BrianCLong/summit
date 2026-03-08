import json
import os

def check_calibration_drift(calibration_error_7d, baseline_calibration_error, output_dir="artifacts/behavior-forecasting"):
    os.makedirs(output_dir, exist_ok=True)

    threshold = baseline_calibration_error * 1.15
    is_drifting = calibration_error_7d > threshold

    drift_report = {
        "calibration_error_7d": calibration_error_7d,
        "baseline": baseline_calibration_error,
        "threshold": threshold,
        "drift_detected": is_drifting,
        "alerts": []
    }

    if is_drifting:
        drift_report["alerts"].append("behavior_forecast_calibration_drift")
        print("Alert emitted: behavior_forecast_calibration_drift")

    with open(os.path.join(output_dir, "drift.json"), "w") as f:
        json.dump(drift_report, f, indent=2)

    return drift_report

if __name__ == "__main__":
    # Simulate a drift check
    check_calibration_drift(0.06, 0.05)
