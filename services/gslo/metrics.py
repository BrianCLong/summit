"""Prometheus metrics and middleware for the Governance SLO service."""

from __future__ import annotations

import time
from typing import Dict

from fastapi import Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, CollectorRegistry, Counter, Gauge, Histogram, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware

REGISTRY = CollectorRegistry()

REQUEST_COUNT = Counter(
    "gslo_requests_total",
    "Total number of requests received by the Governance SLO service.",
    labelnames=("method", "path"),
    registry=REGISTRY,
)

REQUEST_ERRORS = Counter(
    "gslo_request_errors_total",
    "Total number of error responses emitted by the Governance SLO service.",
    labelnames=("method", "path"),
    registry=REGISTRY,
)

REQUEST_LATENCY = Histogram(
    "gslo_request_latency_seconds",
    "Latency of HTTP requests served by the Governance SLO service.",
    labelnames=("method", "path"),
    registry=REGISTRY,
)

SLO_GAUGES: Dict[str, Gauge] = {
    "time_to_block_seconds": Gauge(
        "gslo_time_to_block_seconds",
        "Mean seconds from violation detection to block action.",
        registry=REGISTRY,
    ),
    "false_negative_rate": Gauge(
        "gslo_false_negative_rate",
        "False negative rate observed on seeded canary violations.",
        registry=REGISTRY,
    ),
    "decision_freshness_seconds": Gauge(
        "gslo_decision_freshness_seconds",
        "Mean seconds between policy commit publication and decision execution.",
        registry=REGISTRY,
    ),
    "appeal_latency_seconds": Gauge(
        "gslo_appeal_latency_seconds",
        "Mean seconds to resolve governance appeals.",
        registry=REGISTRY,
    ),
}

BURN_RATE_GAUGES: Dict[str, Gauge] = {}


def get_burn_rate_gauge(name: str) -> Gauge:
    if name not in BURN_RATE_GAUGES:
        BURN_RATE_GAUGES[name] = Gauge(
            f"gslo_{name}_burn_rate",
            f"Burn rate for the {name} SLO.",
            registry=REGISTRY,
        )
    return BURN_RATE_GAUGES[name]


class REDMetricsMiddleware(BaseHTTPMiddleware):
    """Middleware that records RED metrics for FastAPI endpoints."""

    async def dispatch(self, request: Request, call_next) -> Response:  # type: ignore[override]
        method = request.method
        path = request.url.path
        REQUEST_COUNT.labels(method=method, path=path).inc()
        start = time.perf_counter()
        try:
            response = await call_next(request)
            if response.status_code >= 500:
                REQUEST_ERRORS.labels(method=method, path=path).inc()
            return response
        except Exception:
            REQUEST_ERRORS.labels(method=method, path=path).inc()
            raise
        finally:
            duration = time.perf_counter() - start
            REQUEST_LATENCY.labels(method=method, path=path).observe(duration)


def metrics_response() -> Response:
    payload = generate_latest(REGISTRY)
    return Response(content=payload, media_type=CONTENT_TYPE_LATEST)
