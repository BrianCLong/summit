from typing import Any, Dict

from summit.telemetry.instrumentation import get_telemetry


class SummitMetrics:
    def __init__(self) -> None:
        self.meter = get_telemetry().meter

        self.scout_runs_total = self.meter.create_counter(
            name="scout_runs_total",
            description="Total number of scout executions",
            unit="1"
        )

        self.scout_duration_seconds = self.meter.create_histogram(
            name="scout_duration_seconds",
            description="Duration of scout execution in seconds",
            unit="s"
        )

        self.scout_errors_total = self.meter.create_counter(
            name="scout_errors_total",
            description="Total number of scout execution errors",
            unit="1"
        )

        self.scout_cost_total = self.meter.create_counter(
            name="scout_cost_total",
            description="Total cost of scout execution in milliseconds",
            unit="ms"
        )

    def record_scout_run(self, scout_name: str, duration_s: float, status: str, cost_ms: int = 0) -> None:
        attributes = {"scout_name": scout_name, "status": status}
        self.scout_runs_total.add(1, attributes)
        self.scout_duration_seconds.record(duration_s, attributes)
        if cost_ms > 0:
            self.scout_cost_total.add(cost_ms, attributes)

    def record_scout_error(self, scout_name: str, error_type: str) -> None:
        attributes = {"scout_name": scout_name, "error_type": error_type}
        self.scout_errors_total.add(1, attributes)

# Singleton
_metrics_instance = None

def get_metrics() -> SummitMetrics:
    global _metrics_instance
    if _metrics_instance is None:
        _metrics_instance = SummitMetrics()
    return _metrics_instance
