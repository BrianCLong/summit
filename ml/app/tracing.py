"""OpenTelemetry tracing configuration for the ML service."""

from __future__ import annotations

import logging
import os
from typing import Optional

from opentelemetry import propagate, trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.instrumentation.celery import CeleryInstrumentor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.propagators.tracecontext import TraceContextTextMapPropagator
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.semconv.resource import ResourceAttributes
from opentelemetry.trace import TracerProvider as TracerProviderType

logger = logging.getLogger(__name__)

_PROVIDER: Optional[TracerProviderType] = None
_INSTRUMENTED = False


def _build_exporter() -> JaegerExporter:
    endpoint = os.getenv(
        "OTEL_EXPORTER_JAEGER_ENDPOINT",
        os.getenv(
            "JAEGER_COLLECTOR_ENDPOINT",
            "http://jaeger-collector.observability.svc.cluster.local:14268/api/traces",
        ),
    )

    return JaegerExporter(
        collector_endpoint=endpoint,
        username=os.getenv("OTEL_EXPORTER_JAEGER_USER"),
        password=os.getenv("OTEL_EXPORTER_JAEGER_PASSWORD"),
    )


def _build_resource() -> Resource:
    return Resource.create(
        {
            ResourceAttributes.SERVICE_NAME: os.getenv("OTEL_SERVICE_NAME", "ml-engine"),
            ResourceAttributes.SERVICE_NAMESPACE: "workflows",
            ResourceAttributes.DEPLOYMENT_ENVIRONMENT: os.getenv("DEPLOY_ENV", "development"),
            ResourceAttributes.SERVICE_INSTANCE_ID: os.getenv("HOSTNAME", "local"),
        }
    )


def init_tracing(*, app=None, component: str = "api") -> TracerProviderType:
    """Initialise the tracer provider and instrument the service."""

    global _PROVIDER, _INSTRUMENTED

    if os.getenv("OTEL_SDK_DISABLED", "false").lower() == "true":
        logger.info("OpenTelemetry tracing disabled via OTEL_SDK_DISABLED=true")
        return trace.get_tracer_provider()

    if _PROVIDER is None:
        exporter = _build_exporter()
        provider = TracerProvider(resource=_build_resource())
        provider.add_span_processor(BatchSpanProcessor(exporter))
        trace.set_tracer_provider(provider)
        propagate.set_global_textmap(TraceContextTextMapPropagator())
        _PROVIDER = provider

    if not _INSTRUMENTED:
        try:
            HTTPXClientInstrumentor().instrument()
            RedisInstrumentor().instrument()
            Psycopg2Instrumentor().instrument()
            CeleryInstrumentor().instrument()
        except Exception as exc:  # pragma: no cover - defensive guard
            logger.warning("Failed to instrument dependency for tracing: %s", exc)
        _INSTRUMENTED = True

    if app is not None and component == "api":
        try:
            FastAPIInstrumentor().instrument_app(app)
        except Exception as exc:  # pragma: no cover - defensive guard
            logger.warning("FastAPI instrumentation failed: %s", exc)

    return _PROVIDER or trace.get_tracer_provider()


def instrument_worker() -> None:
    """Initialise tracing for Celery workers."""

    init_tracing(component="worker")
