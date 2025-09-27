"""Observability helpers for the GraphAI routing service."""
from __future__ import annotations

import time
from typing import Callable

from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)

SERVICE_NAME = "graph-ai"
DEFAULT_TENANT = "unknown"

registry = CollectorRegistry()

request_latency = Histogram(
    "request_latency",
    "Latency for GraphAI API calls.",
    labelnames=["tenant", "service", "operation"],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5),
    registry=registry,
)

error_rate = Counter(
    "error_rate",
    "GraphAI error counter.",
    labelnames=["tenant", "service", "operation"],
    registry=registry,
)

queue_depth = Gauge(
    "queue_depth",
    "Routing backlog depth.",
    labelnames=["tenant", "service"],
    registry=registry,
)

batch_throughput = Counter(
    "batch_throughput",
    "Total requests processed.",
    labelnames=["tenant", "service", "operation"],
    registry=registry,
)

cost_per_call = Histogram(
    "cost_per_call",
    "USD cost per routing decision.",
    labelnames=["tenant", "service", "operation"],
    buckets=(0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1),
    registry=registry,
)


def _labels(tenant: str | None, operation: str) -> dict[str, str]:
    return {
        "tenant": tenant or DEFAULT_TENANT,
        "service": SERVICE_NAME,
        "operation": operation,
    }


def instrument_app(app: FastAPI, *, operation_resolver: Callable[[Request], str] | None = None) -> None:
    @app.middleware("http")
    async def _metrics_middleware(request: Request, call_next):
        start = time.perf_counter()
        tenant = request.headers.get("x-tenant", DEFAULT_TENANT)
        operation = operation_resolver(request) if operation_resolver else request.url.path
        status_code = 200
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        except Exception:
            status_code = 500
            error_rate.labels(**_labels(tenant, operation)).inc()
            raise
        finally:
            latency = time.perf_counter() - start
            request_latency.labels(**_labels(tenant, operation)).observe(latency)
            batch_throughput.labels(**_labels(tenant, operation)).inc()
            if status_code >= 400:
                error_rate.labels(**_labels(tenant, operation)).inc()

    @app.get("/metrics", include_in_schema=False)
    async def metrics_endpoint() -> PlainTextResponse:
        payload = generate_latest(registry)
        return PlainTextResponse(payload.decode("utf-8"), media_type=CONTENT_TYPE_LATEST)


def record_decision(
    *,
    tenant: str | None,
    operation: str,
    latency_ms: float,
    cost_usd: float,
) -> None:
    request_latency.labels(**_labels(tenant, operation)).observe(latency_ms / 1000)
    batch_throughput.labels(**_labels(tenant, operation)).inc()
    cost_per_call.labels(**_labels(tenant, operation)).observe(cost_usd)


def observe_queue(value: int, *, tenant: str | None = None) -> None:
    queue_depth.labels(tenant or DEFAULT_TENANT, SERVICE_NAME).set(value)
