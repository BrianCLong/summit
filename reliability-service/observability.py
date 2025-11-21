"""
Observability Module for Reliability Service

Provides OpenTelemetry tracing and Prometheus metrics for Python services.
Drop-in observability that mirrors the TypeScript implementation.

Usage:
    from observability import tracer, metrics

    # Trace a function
    @tracer.trace("operation.name")
    def my_function():
        pass

    # Record metrics
    metrics.http_requests_total.labels(method="GET", route="/health").inc()
"""

import os
import time
import functools
from typing import Callable, Optional, Any, Dict
from contextlib import contextmanager

# OpenTelemetry imports (optional - graceful degradation if not installed)
try:
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.jaeger.thrift import JaegerExporter
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.trace import Status, StatusCode
    OTEL_AVAILABLE = True
except ImportError:
    OTEL_AVAILABLE = False
    trace = None

# Prometheus imports (optional - graceful degradation if not installed)
try:
    from prometheus_client import Counter, Histogram, Gauge, Summary, REGISTRY, generate_latest
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False

# Configuration from environment
SERVICE_NAME = os.environ.get("OTEL_SERVICE_NAME", "reliability-service")
SERVICE_VERSION = os.environ.get("OTEL_SERVICE_VERSION", "1.0.0")
ENVIRONMENT = os.environ.get("DEPLOYMENT_ENVIRONMENT", "development")
JAEGER_ENDPOINT = os.environ.get("JAEGER_ENDPOINT", "http://localhost:14268/api/traces")
OTEL_ENABLED = os.environ.get("OTEL_ENABLED", "true").lower() == "true"
PROMETHEUS_ENABLED = os.environ.get("PROMETHEUS_ENABLED", "true").lower() == "true"


class TracingService:
    """
    OpenTelemetry Tracing Service

    Provides distributed tracing across services with automatic span creation
    and context propagation.
    """

    def __init__(self):
        self._tracer = None
        self._enabled = OTEL_ENABLED and OTEL_AVAILABLE

        if self._enabled:
            self._initialize()

    def _initialize(self):
        """Initialize OpenTelemetry tracer"""
        try:
            resource = Resource.create({
                "service.name": SERVICE_NAME,
                "service.version": SERVICE_VERSION,
                "deployment.environment": ENVIRONMENT,
            })

            provider = TracerProvider(resource=resource)

            if JAEGER_ENDPOINT:
                jaeger_exporter = JaegerExporter(
                    agent_host_name=JAEGER_ENDPOINT.split("://")[1].split(":")[0],
                    agent_port=int(JAEGER_ENDPOINT.split(":")[-1].split("/")[0]) if ":" in JAEGER_ENDPOINT else 6831,
                )
                provider.add_span_processor(BatchSpanProcessor(jaeger_exporter))

            trace.set_tracer_provider(provider)
            self._tracer = trace.get_tracer(SERVICE_NAME, SERVICE_VERSION)

            print(f"OpenTelemetry tracing initialized for {SERVICE_NAME}")
        except Exception as e:
            print(f"Failed to initialize OpenTelemetry: {e}")
            self._enabled = False

    def trace(self, operation_name: str, attributes: Optional[Dict[str, Any]] = None):
        """
        Decorator to trace a function

        Usage:
            @tracer.trace("my_operation")
            def my_function():
                pass
        """
        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                if not self._enabled or not self._tracer:
                    return func(*args, **kwargs)

                with self._tracer.start_as_current_span(operation_name) as span:
                    if attributes:
                        span.set_attributes(attributes)

                    span.set_attribute("service.name", SERVICE_NAME)
                    span.set_attribute("service.version", SERVICE_VERSION)

                    try:
                        result = func(*args, **kwargs)
                        span.set_status(Status(StatusCode.OK))
                        return result
                    except Exception as e:
                        span.set_status(Status(StatusCode.ERROR, str(e)))
                        span.record_exception(e)
                        raise

            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                if not self._enabled or not self._tracer:
                    return await func(*args, **kwargs)

                with self._tracer.start_as_current_span(operation_name) as span:
                    if attributes:
                        span.set_attributes(attributes)

                    span.set_attribute("service.name", SERVICE_NAME)
                    span.set_attribute("service.version", SERVICE_VERSION)

                    try:
                        result = await func(*args, **kwargs)
                        span.set_status(Status(StatusCode.OK))
                        return result
                    except Exception as e:
                        span.set_status(Status(StatusCode.ERROR, str(e)))
                        span.record_exception(e)
                        raise

            import asyncio
            if asyncio.iscoroutinefunction(func):
                return async_wrapper
            return wrapper

        return decorator

    @contextmanager
    def span(self, operation_name: str, attributes: Optional[Dict[str, Any]] = None):
        """
        Context manager for creating spans

        Usage:
            with tracer.span("my_operation"):
                do_something()
        """
        if not self._enabled or not self._tracer:
            yield None
            return

        with self._tracer.start_as_current_span(operation_name) as span:
            if attributes:
                span.set_attributes(attributes)
            yield span


class MetricsService:
    """
    Prometheus Metrics Service

    Provides RED (Rate, Errors, Duration) and USE (Utilization, Saturation, Errors)
    metrics for comprehensive observability.
    """

    def __init__(self, prefix: str = "reliability"):
        self._enabled = PROMETHEUS_ENABLED and PROMETHEUS_AVAILABLE
        self._prefix = prefix

        if self._enabled:
            self._initialize()

    def _initialize(self):
        """Initialize Prometheus metrics"""
        # HTTP metrics (RED)
        self.http_requests_total = Counter(
            f"{self._prefix}_http_requests_total",
            "Total HTTP requests",
            ["method", "route", "status_code"]
        )

        self.http_errors_total = Counter(
            f"{self._prefix}_http_errors_total",
            "Total HTTP errors",
            ["method", "route", "error_type"]
        )

        self.http_request_duration_seconds = Histogram(
            f"{self._prefix}_http_request_duration_seconds",
            "HTTP request duration",
            ["method", "route"],
            buckets=[0.01, 0.05, 0.1, 0.5, 1, 1.5, 2, 5, 10]
        )

        # Kafka metrics
        self.kafka_messages_processed = Counter(
            f"{self._prefix}_kafka_messages_processed_total",
            "Total Kafka messages processed",
            ["topic", "status"]
        )

        self.kafka_processing_duration = Histogram(
            f"{self._prefix}_kafka_processing_duration_seconds",
            "Kafka message processing duration",
            ["topic"],
            buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
        )

        # Redis metrics
        self.redis_operations_total = Counter(
            f"{self._prefix}_redis_operations_total",
            "Total Redis operations",
            ["operation", "status"]
        )

        self.redis_operation_duration = Histogram(
            f"{self._prefix}_redis_operation_duration_seconds",
            "Redis operation duration",
            ["operation"],
            buckets=[0.001, 0.005, 0.01, 0.05, 0.1]
        )

        # Source scoring metrics
        self.source_scores = Histogram(
            f"{self._prefix}_source_score",
            "Distribution of source reliability scores",
            buckets=[10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
        )

        self.scoring_requests_total = Counter(
            f"{self._prefix}_scoring_requests_total",
            "Total source scoring requests",
            ["status"]
        )

        # USE metrics
        self.cpu_utilization = Gauge(
            f"{self._prefix}_cpu_utilization_percent",
            "CPU utilization percentage"
        )

        self.memory_utilization = Gauge(
            f"{self._prefix}_memory_utilization_percent",
            "Memory utilization percentage"
        )

        self.active_kafka_consumers = Gauge(
            f"{self._prefix}_active_kafka_consumers",
            "Number of active Kafka consumers"
        )

        self.redis_connection_pool_size = Gauge(
            f"{self._prefix}_redis_connection_pool_size",
            "Redis connection pool size"
        )

        print(f"Prometheus metrics initialized with prefix: {self._prefix}")

    def time_operation(self, metric_name: str, labels: Optional[Dict[str, str]] = None):
        """
        Context manager for timing operations

        Usage:
            with metrics.time_operation("http_request", {"method": "GET"}):
                do_something()
        """
        class Timer:
            def __init__(self, histogram, labels):
                self.histogram = histogram
                self.labels = labels or {}
                self.start_time = None

            def __enter__(self):
                self.start_time = time.time()
                return self

            def __exit__(self, exc_type, exc_val, exc_tb):
                duration = time.time() - self.start_time
                if self.histogram:
                    self.histogram.labels(**self.labels).observe(duration)

        histogram = getattr(self, f"{metric_name}_duration_seconds", None) if self._enabled else None
        return Timer(histogram, labels)

    def get_metrics(self) -> bytes:
        """Get current metrics in Prometheus format"""
        if not self._enabled:
            return b""
        return generate_latest(REGISTRY)


# Global instances
tracer = TracingService()
metrics = MetricsService()


# FastAPI middleware integration
def create_observability_middleware():
    """
    Create FastAPI middleware for automatic request tracing and metrics

    Usage:
        from observability import create_observability_middleware
        app.middleware("http")(create_observability_middleware())
    """
    async def middleware(request, call_next):
        method = request.method
        route = request.url.path

        with tracer.span(f"http.{method.lower()}", {
            "http.method": method,
            "http.url": str(request.url),
            "http.route": route,
        }):
            with metrics.time_operation("http_request", {"method": method, "route": route}):
                start_time = time.time()

                try:
                    response = await call_next(request)
                    status_code = response.status_code

                    if metrics._enabled:
                        metrics.http_requests_total.labels(
                            method=method,
                            route=route,
                            status_code=str(status_code)
                        ).inc()

                    return response

                except Exception as e:
                    if metrics._enabled:
                        metrics.http_errors_total.labels(
                            method=method,
                            route=route,
                            error_type=type(e).__name__
                        ).inc()
                    raise

    return middleware


# Utility decorators
def trace_kafka_message(topic: str):
    """Decorator for tracing Kafka message processing"""
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            with tracer.span(f"kafka.process.{topic}", {"messaging.destination": topic}):
                with metrics.time_operation("kafka_processing", {"topic": topic}):
                    try:
                        result = await func(*args, **kwargs)
                        if metrics._enabled:
                            metrics.kafka_messages_processed.labels(topic=topic, status="success").inc()
                        return result
                    except Exception as e:
                        if metrics._enabled:
                            metrics.kafka_messages_processed.labels(topic=topic, status="error").inc()
                        raise
        return wrapper
    return decorator


def trace_redis_operation(operation: str):
    """Decorator for tracing Redis operations"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            with tracer.span(f"redis.{operation}", {"db.system": "redis", "db.operation": operation}):
                with metrics.time_operation("redis_operation", {"operation": operation}):
                    try:
                        result = func(*args, **kwargs)
                        if metrics._enabled:
                            metrics.redis_operations_total.labels(operation=operation, status="success").inc()
                        return result
                    except Exception as e:
                        if metrics._enabled:
                            metrics.redis_operations_total.labels(operation=operation, status="error").inc()
                        raise
        return wrapper
    return decorator
