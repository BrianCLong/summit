from typing import Dict, Any

class DriftDetector:
    def __init__(self, threshold: float = 0.1):
        self.threshold = threshold

    def detect_regression(self, current_metrics: Dict[str, float], baseline_metrics: Dict[str, float]) -> bool:
        for metric, value in current_metrics.items():
            if metric in baseline_metrics:
                baseline = baseline_metrics[metric]
                if baseline == 0:
                    # Avoid division by zero. If baseline is 0, any positive value for cost is regression,
                    # and any negative value for success_rate (not possible) is regression.
                    # Simple heuristic: if baseline is 0 and value > 0 for cost, it's drift.
                    if metric == "cost" and value > 0:
                        return True
                    continue

                # If metric is success rate, lower is bad
                if metric == "success_rate":
                    if (baseline - value) / baseline > self.threshold:
                        return True
                # If metric is cost, higher is bad
                elif metric == "cost":
                    if (value - baseline) / baseline > self.threshold:
                        return True
        return False
