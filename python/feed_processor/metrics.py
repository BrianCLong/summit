"""Telemetry helpers for the real-time feed processor."""

from __future__ import annotations

import contextlib
import threading
import time
from dataclasses import dataclass
from typing import Dict, Iterable, Optional

try:  # pragma: no cover - optional dependency
    from prometheus_client import CollectorRegistry, Counter, Histogram
except Exception:  # pragma: no cover - fallback when library missing
    CollectorRegistry = None  # type: ignore
    Counter = None  # type: ignore
    Histogram = None  # type: ignore

try:  # pragma: no cover - optional dependency
    from opentelemetry import metrics as otel_metrics
    from opentelemetry import trace
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.sdk.trace.sampling import ParentBased, TraceIdRatioBased
    from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import (
        OTLPMetricExporter,
    )
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
except Exception:  # pragma: no cover - fallback when library missing
    otel_metrics = None  # type: ignore
    trace = None  # type: ignore
    MeterProvider = None  # type: ignore
    PeriodicExportingMetricReader = None  # type: ignore
    Resource = None  # type: ignore
    TracerProvider = None  # type: ignore
    BatchSpanProcessor = None  # type: ignore
    ParentBased = None  # type: ignore
    TraceIdRatioBased = None  # type: ignore
    OTLPMetricExporter = None  # type: ignore
    OTLPSpanExporter = None  # type: ignore

from .config import TelemetryConfig


@dataclass(slots=True)
class _Counter:
    """Fallback counter used when Prometheus or OTel isn't available."""

    value: int = 0

    def inc(self, amount: int = 1) -> None:
        self.value += amount


@dataclass(slots=True)
class _Histogram:
    """Fallback histogram used when Prometheus is unavailable."""

    count: int = 0
    total: float = 0.0

    def observe(self, value: float) -> None:
        self.count += 1
        self.total += value

    @property
    def average(self) -> float:
        return self.total / self.count if self.count else 0.0


class RealtimeMetrics:
    """Surface counters to both Prometheus and OpenTelemetry."""

    def __init__(
        self,
        telemetry: TelemetryConfig,
        registry: Optional[CollectorRegistry] = None,
        otel_meter_provider: Optional[MeterProvider] = None,
    ) -> None:
        self.telemetry = telemetry
        self.registry = registry or (CollectorRegistry() if CollectorRegistry else None)
        self._lock = threading.Lock()

        self._processed_counter = self._build_counter(
            "feed_processor_processed_total",
            "Number of feed messages processed successfully",
        )
        self._failed_counter = self._build_counter(
            "feed_processor_failed_total",
            "Number of feed messages that failed permanently",
        )
        self._retry_counter = self._build_counter(
            "feed_processor_retries_total",
            "Number of retry attempts performed by the feed processor",
        )
        self._latency_histogram = self._build_histogram(
            "feed_processor_latency_seconds",
            "Processing latency for feed messages",
        )

        self._otel_meter_provider = otel_meter_provider
        self._otel_meter = (
            otel_meter_provider.get_meter(telemetry.service_name)
            if (otel_metrics and otel_meter_provider)
            else None
        )
        self._otel_processed = None
        self._otel_failed = None
        self._otel_retries = None
        self._otel_latency = None
        if self._otel_meter:
            self._otel_processed = self._otel_meter.create_counter(
                name="feed_processor_processed_total",
                description="Number of feed messages processed successfully",
            )
            self._otel_failed = self._otel_meter.create_counter(
                name="feed_processor_failed_total",
                description="Number of feed messages that failed permanently",
            )
            self._otel_retries = self._otel_meter.create_counter(
                name="feed_processor_retries_total",
                description="Number of retry attempts performed by the feed processor",
            )
            self._otel_latency = self._otel_meter.create_histogram(
                name="feed_processor_latency_seconds",
                unit="s",
                description="Processing latency for feed messages",
            )

    def _build_counter(self, name: str, documentation: str):  # type: ignore[no-untyped-def]
        if Counter and self.registry:
            return Counter(name, documentation, registry=self.registry)
        return _Counter()

    def _build_histogram(self, name: str, documentation: str):  # type: ignore[no-untyped-def]
        if Histogram and self.registry:
            return Histogram(name, documentation, registry=self.registry)
        return _Histogram()

    def record_success(self, duration: float) -> None:
        with self._lock:
            self._processed_counter.inc()  # type: ignore[arg-type]
            self._latency_histogram.observe(duration)  # type: ignore[arg-type]
        if self._otel_processed:
            self._otel_processed.add(1)
        if self._otel_latency:
            self._otel_latency.record(duration)

    def record_failure(self) -> None:
        with self._lock:
            self._failed_counter.inc()  # type: ignore[arg-type]
        if self._otel_failed:
            self._otel_failed.add(1)

    def record_retry(self) -> None:
        with self._lock:
            self._retry_counter.inc()  # type: ignore[arg-type]
        if self._otel_retries:
            self._otel_retries.add(1)

    @contextlib.contextmanager
    def span(self, name: str):
        if trace:
            tracer = trace.get_tracer(self.telemetry.service_name)
            with tracer.start_as_current_span(name) as span:  # pragma: no cover - trivial
                yield span
        else:
            yield None


class ThroughputTracker:
    """Maintain a rolling throughput calculation for alerting."""

    def __init__(self, window_seconds: float = 60.0) -> None:
        self.window_seconds = window_seconds
        self._events: Dict[int, float] = {}
        self._lock = threading.Lock()

    def track(self, event_id: int, timestamp: Optional[float] = None) -> None:
        ts = timestamp or time.time()
        with self._lock:
            self._events[event_id] = ts
            cutoff = ts - self.window_seconds
            expired = [key for key, value in self._events.items() if value < cutoff]
            for key in expired:
                del self._events[key]

    def events_per_second(self) -> float:
        with self._lock:
            if not self._events:
                return 0.0
            span = max(self._events.values()) - min(self._events.values())
            if span <= 0:
                return float(len(self._events)) / max(self.window_seconds, 1.0)
            return float(len(self._events)) / span


def configure_otel(config: TelemetryConfig) -> Optional[MeterProvider]:
    """Configure OpenTelemetry providers when dependencies are available."""

    if not (trace and otel_metrics and TracerProvider and MeterProvider and Resource):
        return None

    resource = Resource(attributes={"service.name": config.service_name})
    sampler = ParentBased(TraceIdRatioBased(config.sampling_ratio)) if ParentBased else None

    tracer_provider = TracerProvider(resource=resource, sampler=sampler)
    if config.otlp_endpoint and OTLPSpanExporter and BatchSpanProcessor:
        span_exporter = OTLPSpanExporter(endpoint=config.otlp_endpoint, insecure=True)
        tracer_provider.add_span_processor(BatchSpanProcessor(span_exporter))
    trace.set_tracer_provider(tracer_provider)

    metric_readers: Iterable = []
    if config.otlp_endpoint and OTLPMetricExporter and PeriodicExportingMetricReader:
        metric_exporter = OTLPMetricExporter(endpoint=config.otlp_endpoint, insecure=True)
        metric_readers = [PeriodicExportingMetricReader(metric_exporter)]
    meter_provider = MeterProvider(resource=resource, metric_readers=list(metric_readers))
    otel_metrics.set_meter_provider(meter_provider)
    return meter_provider
