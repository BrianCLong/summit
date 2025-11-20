# ops/observability.py

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from threading import Lock
from typing import Dict, List, Mapping, Optional


@dataclass(frozen=True)
class _MetricSample:
    """Represents a single metric data point recorded for a Prometheus metric."""

    value: float
    labels: Mapping[str, str]
    recorded_at: datetime


_RECORDED_PROM_METRICS: Dict[str, List[_MetricSample]] = {}
_METRICS_LOCK = Lock()


def init_otel_tracing():
    """Stub for initializing OpenTelemetry tracing."""

    print("Initializing OpenTelemetry tracing.")


def _normalise_labels(labels: Optional[Mapping[str, object]]) -> Dict[str, str]:
    """Normalise label keys and values to strings for consistent storage."""

    if not labels:
        return {}

    normalised: Dict[str, str] = {}
    for key, value in labels.items():
        if key is None:
            raise ValueError("Metric label keys cannot be None")
        normalised[str(key)] = "" if value is None else str(value)
    return normalised


def record_prom_metric(metric_name: str, value: float, labels: Optional[Mapping[str, object]] = None):
    """
    Record a Prometheus metric data point for local testing and verification.

    In production we would push metrics to Prometheus via a client library. For
    tests and local tooling we maintain an in-memory registry of recorded
    samples so callers can assert on metric emissions.
    """

    if not metric_name or not isinstance(metric_name, str):
        raise ValueError("metric_name must be a non-empty string")

    try:
        numeric_value = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise ValueError("value must be numeric") from exc

    normalised_labels = _normalise_labels(labels)
    sample = _MetricSample(
        value=numeric_value,
        labels=normalised_labels,
        recorded_at=datetime.now(timezone.utc),
    )

    with _METRICS_LOCK:
        _RECORDED_PROM_METRICS.setdefault(metric_name, []).append(sample)

    print(
        f"Recording Prometheus metric: {metric_name}={numeric_value} "
        f"with labels {normalised_labels}"
    )


def get_recorded_prom_metrics(metric_name: Optional[str] = None):
    """Return a copy of the recorded Prometheus metrics registry."""

    with _METRICS_LOCK:
        if metric_name is None:
            return {
                name: [asdict(sample) for sample in samples]
                for name, samples in _RECORDED_PROM_METRICS.items()
            }
        samples = _RECORDED_PROM_METRICS.get(metric_name, [])
        return [asdict(sample) for sample in samples]


def clear_recorded_prom_metrics():
    """Clear all recorded Prometheus metrics (useful for tests)."""

    with _METRICS_LOCK:
        _RECORDED_PROM_METRICS.clear()


def get_slo_dashboard_url(service_name: str) -> str:
    """Stub for getting SLO dashboard URL."""

    print(f"Getting SLO dashboard URL for {service_name}")
    return f"http://grafana.example.com/d/slo-{service_name}"
