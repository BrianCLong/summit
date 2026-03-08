import json
import os
import sys


def detect_drift(report_dir="reports/ref_fid_eval", threshold=0.8):
    """
    Checks the metrics.json artifact for fidelity regressions.
    Fails if HF metric drops below threshold.
    """
    metrics_path = os.path.join(report_dir, "metrics.json")
    if not os.path.exists(metrics_path):
        print(f"Error: {metrics_path} not found.")
        sys.exit(1)

    with open(metrics_path) as f:
        metrics = json.load(f)

    hf_score = metrics.get("overall_highfreq_similarity", 0.0)

    if hf_score < threshold:
        print(f"Drift detected! High-frequency similarity {hf_score} < {threshold}")
        sys.exit(1)

    print(f"Fidelity intact: {hf_score} >= {threshold}")
    sys.exit(0)

if __name__ == "__main__":
    detect_drift()
