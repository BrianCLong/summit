"""Tracing helpers for OpenTelemetry + Jaeger."""

from __future__ import annotations

from typing import Optional

from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.semconv.resource import ResourceAttributes

from .config import Settings


def configure_tracing(settings: Settings) -> Optional[TracerProvider]:
    """Configure OpenTelemetry to export traces to Jaeger."""

    if not settings.tracing_enabled:
        return None

    resource = Resource.create(
        {
            ResourceAttributes.SERVICE_NAME: settings.service_name,
            ResourceAttributes.SERVICE_NAMESPACE: settings.service_namespace,
            ResourceAttributes.SERVICE_VERSION: settings.service_version,
        }
    )

    provider = TracerProvider(resource=resource)
    exporter = JaegerExporter(
        agent_host_name=settings.jaeger_host,
        agent_port=settings.jaeger_port,
    )
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    RedisInstrumentor().instrument()
    return provider
