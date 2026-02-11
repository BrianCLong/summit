from typing import Dict, Any, List

class DriftDetector:
    def __init__(self, threshold: float = 0.1):
        self.threshold = threshold

    def detect_drift(self, current_metrics: Dict[str, Any], baseline_metrics: Dict[str, Any]) -> List[str]:
        regressions = []
        for k, v in baseline_metrics.items():
            if k in current_metrics:
                cur_v = current_metrics[k]
                if isinstance(v, (int, float)) and isinstance(cur_v, (int, float)):
                    # Assume higher is better for success_rate, lower is better for cost/time
                    if k == "success_rate":
                        if cur_v < v * (1 - self.threshold):
                            regressions.append(f"Significant regression in {k}: {cur_v} vs {v}")
                    else:
                        if cur_v > v * (1 + self.threshold):
                            regressions.append(f"Significant regression in {k}: {cur_v} vs {v}")
        return regressions
