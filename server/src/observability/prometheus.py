import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from prometheus_client import Counter, Histogram, Gauge

# Metrics definitions
HTTP_REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"]
)

HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total number of HTTP requests",
    ["method", "endpoint", "status_code"]
)

ACTIVE_CONNECTIONS = Gauge(
    "http_active_connections",
    "Number of active HTTP connections"
)

class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        ACTIVE_CONNECTIONS.inc()
        start_time = time.time()

        # Get path for labeling - avoid cardinality explosion by using router path if available
        path = request.url.path
        if hasattr(request, "scope") and "route" in request.scope:
             route = request.scope["route"]
             if hasattr(route, "path"):
                 path = route.path

        try:
            response = await call_next(request)

            duration = time.time() - start_time
            HTTP_REQUEST_LATENCY.labels(
                method=request.method,
                endpoint=path
            ).observe(duration)

            HTTP_REQUESTS_TOTAL.labels(
                method=request.method,
                endpoint=path,
                status_code=response.status_code
            ).inc()

            return response
        except Exception:
            HTTP_REQUESTS_TOTAL.labels(
                method=request.method,
                endpoint=path,
                status_code=500
            ).inc()
            raise
        finally:
            ACTIVE_CONNECTIONS.dec()
