# ops/observability.py

from __future__ import annotations

import contextvars
from collections.abc import Mapping, MutableMapping
from contextlib import contextmanager
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from threading import Lock
from typing import TYPE_CHECKING
from uuid import uuid4

if TYPE_CHECKING:  # pragma: no cover - import hints only
    from opentelemetry.trace import Span


@dataclass(frozen=True)
class _MetricSample:
    """Represents a single metric data point recorded for a Prometheus metric."""

    value: float
    labels: Mapping[str, str]
    recorded_at: datetime


_RECORDED_PROM_METRICS: dict[str, list[_MetricSample]] = {}
_METRICS_LOCK = Lock()
_CORRELATION_ID = contextvars.ContextVar("correlation_id", default=None)


def init_otel_tracing(
    service_name: str,
    endpoint: str = "http://otel-collector:4317",
    environment: str | None = None,
):
    """Configure OpenTelemetry tracing for a service with correlation context.

    This helper wires a production-ready OTLP exporter, sampler, and resource
    attributes. It also attaches a span processor that enriches spans with the
    current correlation ID so downstream services and logs stay aligned.
    """

    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
        OTLPSpanExporter,
    )
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.sdk.trace.sampling import ParentBased, TraceIdRatioBased

    resource = Resource.create(
        {
            "service.name": service_name,
            "deployment.environment": environment or "dev",
        }
    )

    tracer_provider = TracerProvider(
        resource=resource,
        sampler=ParentBased(TraceIdRatioBased(1.0)),
    )
    span_exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
    span_processor = BatchSpanProcessor(span_exporter)
    tracer_provider.add_span_processor(span_processor)

    def _add_correlation_id(span, *_args):
        correlation_id = get_correlation_id()
        if correlation_id:
            span.set_attribute("correlation_id", correlation_id)

    tracer_provider.add_span_processor(_CallbackSpanProcessor(_add_correlation_id))
    trace.set_tracer_provider(tracer_provider)


def _normalise_labels(labels: Mapping[str, object] | None) -> dict[str, str]:
    """Normalise label keys and values to strings for consistent storage."""

    if not labels:
        return {}

    normalised: dict[str, str] = {}
    for key, value in labels.items():
        if key is None:
            raise ValueError("Metric label keys cannot be None")
        normalised[str(key)] = "" if value is None else str(value)
    return normalised


def record_prom_metric(metric_name: str, value: float, labels: Mapping[str, object] | None = None):
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
        recorded_at=datetime.now(UTC),
    )

    with _METRICS_LOCK:
        _RECORDED_PROM_METRICS.setdefault(metric_name, []).append(sample)

    print(
        f"Recording Prometheus metric: {metric_name}={numeric_value} "
        f"with labels {normalised_labels}"
    )


def generate_correlation_id() -> str:
    """Generate a RFC4122 correlation identifier and set it in the context."""

    correlation_id = str(uuid4())
    _CORRELATION_ID.set(correlation_id)
    return correlation_id


def get_correlation_id(headers: Mapping[str, str] | None = None) -> str | None:
    """Return the active correlation ID, seeding it from incoming headers if present."""

    existing = _CORRELATION_ID.get()
    if existing:
        return existing

    header_value: str | None = None
    if headers:
        header_value = headers.get("x-request-id") or headers.get("X-Request-Id")
        header_value = header_value or headers.get("traceparent")

    if header_value:
        _CORRELATION_ID.set(header_value)
        return header_value

    return generate_correlation_id()


def attach_correlation_header(headers: MutableMapping[str, str]) -> MutableMapping[str, str]:
    """Ensure outbound headers carry the correlation ID alongside trace context."""

    correlation_id = get_correlation_id(headers)
    headers["x-request-id"] = correlation_id
    return headers


class _CallbackSpanProcessor:
    """Minimal span processor used to inject correlation IDs on span start."""

    def __init__(self, callback):
        self._callback = callback

    def on_start(self, span: Span, parent_context=None):
        self._callback(span, parent_context)

    def on_end(self, span: Span):  # pragma: no cover - passthrough
        return None

    def shutdown(self):  # pragma: no cover - passthrough
        return None

    def force_flush(self, timeout_millis: int = 30000):  # pragma: no cover
        return True


@contextmanager
def traced_operation(operation: str, attributes: Mapping[str, object] | None = None):
    """Context manager to trace an operation with correlation-aware metadata."""

    from opentelemetry import trace

    tracer = trace.get_tracer("summit.ops.observability")
    with tracer.start_as_current_span(operation) as span:
        correlation_id = get_correlation_id()
        span.set_attribute("correlation_id", correlation_id)
        if attributes:
            for key, value in attributes.items():
                span.set_attribute(str(key), value)
        yield span


def get_recorded_prom_metrics(metric_name: str | None = None):
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
