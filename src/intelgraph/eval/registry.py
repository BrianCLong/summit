from typing import Any, Protocol


class Metric(Protocol):
    name: str

    def compute(self, y_true: Any, y_pred: Any) -> float: ...


class MetricRegistry:
    def __init__(self) -> None:
        self._metrics: dict[str, Metric] = {}

    def register(self, metric: Metric) -> None:
        if metric.name in self._metrics:
            raise ValueError(f"Metric {metric.name} already registered")
        self._metrics[metric.name] = metric

    def get(self, name: str) -> Metric:
        if name not in self._metrics:
            raise ValueError(f"Metric {name} not found")
        return self._metrics[name]


# Built-in metrics
class AccuracyMetric:
    name = "accuracy"

    def compute(self, y_true: Any, y_pred: Any) -> float:
        return 1.0 if y_true == y_pred else 0.0


class MAEMetric:
    name = "mean_absolute_error"

    def compute(self, y_true: Any, y_pred: Any) -> float:
        return abs(float(y_true) - float(y_pred))


# Default registry instance
registry = MetricRegistry()
registry.register(AccuracyMetric())
registry.register(MAEMetric())
