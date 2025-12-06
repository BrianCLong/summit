import time
import random

class ROIEngine:
    def __init__(self):
        self.metrics = {
            "efficiency_uplift": 0.0,
            "cost_savings": 0.0,
            "cycle_time_reduction": 0.0,
            "roi_percentage": 0.0
        }
        self.baseline_cycle_time = 100  # ms
        self.current_cycle_time = 100

    def record_transaction(self, cycle_time_ms: float, cost_saved: float):
        """
        Updates metrics based on a new transaction.
        """
        self.current_cycle_time = (self.current_cycle_time * 0.9) + (cycle_time_ms * 0.1)

        # Calculate reductions
        reduction = max(0, self.baseline_cycle_time - self.current_cycle_time)
        reduction_pct = (reduction / self.baseline_cycle_time) * 100

        self.metrics["cycle_time_reduction"] = reduction_pct
        self.metrics["cost_savings"] += cost_saved

        # Simple ROI model: (Savings / Investment) * 100.
        # Assume constant investment for simulation.
        investment = 1000
        self.metrics["roi_percentage"] = (self.metrics["cost_savings"] / investment) * 100

        # Efficiency uplift modeled as inverse of cycle time
        self.metrics["efficiency_uplift"] = reduction_pct * 1.5

    def get_metrics(self) -> dict:
        return self.metrics

    def generate_prometheus_metrics(self) -> str:
        """
        Exports metrics in Prometheus format.
        """
        lines = []
        lines.append(f"# HELP roi_efficiency_uplift_percent Efficiency improvement over baseline")
        lines.append(f"# TYPE roi_efficiency_uplift_percent gauge")
        lines.append(f"roi_efficiency_uplift_percent {self.metrics['efficiency_uplift']:.2f}")

        lines.append(f"# HELP roi_cost_savings_total Total cost savings accumulated")
        lines.append(f"# TYPE roi_cost_savings_total counter")
        lines.append(f"roi_cost_savings_total {self.metrics['cost_savings']:.2f}")

        lines.append(f"# HELP roi_percentage Calculated ROI percentage")
        lines.append(f"# TYPE roi_percentage gauge")
        lines.append(f"roi_percentage {self.metrics['roi_percentage']:.2f}")

        return "\n".join(lines)

if __name__ == "__main__":
    engine = ROIEngine()
    # Simulate some traffic
    for _ in range(10):
        engine.record_transaction(random.randint(40, 60), random.randint(10, 50))
    print(engine.generate_prometheus_metrics())
