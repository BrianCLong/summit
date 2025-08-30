"""Logging and metrics utilities."""

from __future__ import annotations

import logging
from prometheus_client import Counter, Histogram

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger("deescalation-coach")

REQUEST_COUNT = Counter("request_count", "number of analyze requests")
REQUEST_LATENCY = Histogram("request_latency_seconds", "request latency")
MODEL_LATENCY = Histogram("model_latency_seconds", "model generation latency")
CONTENT_DRIFT_COUNT = Counter("content_drift_count", "detected content drift")


def record_metrics(latency: float, model_latency: float, drift: bool) -> None:
    REQUEST_COUNT.inc()
    REQUEST_LATENCY.observe(latency)
    MODEL_LATENCY.observe(model_latency)
    if drift:
        CONTENT_DRIFT_COUNT.inc()
