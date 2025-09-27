from __future__ import annotations

from fastapi import FastAPI, Response
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    Counter,
    Histogram,
    generate_latest,
)

from .api import router
from .pipeline import _get_backend

app = FastAPI(title="Cognitive Insights & Safety Engine")
app.include_router(router)

registry = CollectorRegistry()
REQUEST_COUNT = Counter("request_count", "HTTP request count", ["endpoint"], registry=registry)
LATENCY = Histogram("request_latency_seconds", "Request latency", ["endpoint"], registry=registry)


@app.on_event("startup")
def startup() -> None:
    _get_backend().warmup()


@app.get("/metrics")
def metrics() -> Response:
    data = generate_latest(registry)
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
