import logging
import time

from fastapi import Request
from prometheus_client import Counter, Histogram, generate_latest

REQUEST_COUNT = Counter("request_count", "Total requests", ["path"])
LATENCY = Histogram("request_latency_ms", "Latency", ["path"])


async def metrics() -> bytes:
    return generate_latest()


async def logging_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    LATENCY.labels(request.url.path).observe((time.time() - start) * 1000)
    REQUEST_COUNT.labels(request.url.path).inc()
    logging.info("request", extra={"path": request.url.path})
    return response
