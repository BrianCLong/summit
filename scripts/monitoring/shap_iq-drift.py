import json
import os
from typing import Any, Dict


def detect_drift(current_metrics: dict[str, Any], baseline_metrics: dict[str, Any]) -> dict[str, Any]:
    threshold = 0.1 # 10% tolerance

    current_mean_abs_shap = current_metrics["metrics"].get("mean_abs_shap", 0.0)
    baseline_mean_abs_shap = baseline_metrics["metrics"].get("mean_abs_shap", 0.0)

    current_interaction_strength_mean = current_metrics["metrics"].get("interaction_strength_mean", 0.0)
    baseline_interaction_strength_mean = baseline_metrics["metrics"].get("interaction_strength_mean", 0.0)

    drift_report = {
        "mean_abs_shap_drift": abs(current_mean_abs_shap - baseline_mean_abs_shap),
        "interaction_strength_drift": abs(current_interaction_strength_mean - baseline_interaction_strength_mean),
        "is_drift_detected": False
    }

    if drift_report["mean_abs_shap_drift"] > threshold or drift_report["interaction_strength_drift"] > threshold:
        drift_report["is_drift_detected"] = True

    with open("drift_report.json", "w") as f:
        json.dump(drift_report, f, indent=2)

    return drift_report

if __name__ == "__main__":
    detect_drift({"metrics": {"mean_abs_shap": 0.5, "interaction_strength_mean": 0.2}}, {"metrics": {"mean_abs_shap": 0.45, "interaction_strength_mean": 0.18}})
