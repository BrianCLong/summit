import argparse
import json
from pathlib import Path


def detect_drift(current_metrics_path: str, baseline_metrics_path: str, threshold: float = 0.05):
    """
    Detects performance drift between current metrics and baseline.
    """
    with open(current_metrics_path) as f:
        current = json.load(f)["metrics"]
    with open(baseline_metrics_path) as f:
        baseline = json.load(f)["metrics"]

    drifts = []
    for key in ["accuracy", "p95_latency_ms"]:
        if key in current and key in baseline:
            c_val = current[key]
            b_val = baseline[key]

            if key == "accuracy":
                diff = b_val - c_val # Accuracy drop
                if diff > threshold:
                    drifts.append(f"Accuracy drifted: {b_val} -> {c_val} (drop: {diff})")
            elif key == "p95_latency_ms":
                diff = (c_val - b_val) / b_val # Latency increase %
                if diff > threshold:
                    drifts.append(f"Latency drifted: {b_val} -> {c_val} (increase: {diff:.2%})")

    return drifts

def main():
    parser = argparse.ArgumentParser(description="Qwen3.5 Drift Detector")
    parser.add_argument("--current", required=True, help="Path to current metrics.json")
    parser.add_argument("--baseline", required=True, help="Path to baseline metrics.json")
    parser.add_argument("--threshold", type=float, default=0.05, help="Drift threshold")
    args = parser.parse_args()

    drifts = detect_drift(args.current, args.baseline, args.threshold)

    if drifts:
        print("Drift detected!")
        for d in drifts:
            print(f"  - {d}")
        # In a real CI job, we might exit with 1 here.
    else:
        print("No significant drift detected.")

if __name__ == "__main__":
    main()
