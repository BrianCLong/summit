from typing import Dict, List, Any

class DriftDetector:
    def __init__(self, success_threshold: float = 0.05, cost_threshold: float = 0.20):
        self.success_threshold = success_threshold
        self.cost_threshold = cost_threshold

    def analyze_drift(self, baseline: Dict[str, Any], current: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compares current metrics to baseline.
        Returns report with regression flags.
        """
        report = {
            "regression": False,
            "details": {}
        }

        # Success Rate check
        b_success = baseline.get("success_rate", 1.0)
        c_success = current.get("success_rate", 1.0)
        success_delta = b_success - c_success

        if success_delta > self.success_threshold:
            report["regression"] = True
            report["details"]["success_rate"] = {
                "baseline": b_success,
                "current": c_success,
                "delta": success_delta,
                "status": "FAIL"
            }
        else:
            report["details"]["success_rate"] = {"status": "PASS"}

        # Cost check
        b_cost = baseline.get("avg_cost", 0.0)
        c_cost = current.get("avg_cost", 0.0)
        if b_cost > 0:
            cost_increase = (c_cost - b_cost) / b_cost
            if cost_increase > self.cost_threshold:
                report["regression"] = True
                report["details"]["avg_cost"] = {
                    "baseline": b_cost,
                    "current": c_cost,
                    "increase": cost_increase,
                    "status": "FAIL"
                }
            else:
                report["details"]["avg_cost"] = {"status": "PASS"}

        return report
