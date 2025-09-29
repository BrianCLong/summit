from __future__ import annotations

import time
from functools import wraps

from prometheus_client import Counter, Histogram

requests_total = Counter("requests_total", "Total requests", ["route"])
latency_ms = Histogram("latency_ms", "Request latency", ["route"])
cf_search_ms = Histogram("cf_search_ms", "Counterfactual search latency")
robustness_samples_total = Counter("robustness_samples_total", "Robustness samples")
overlay_toggles_total = Counter(
    "insight_overlay_toggles_total", "AI insight overlay toggles", ["state"]
)


def track(route: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            requests_total.labels(route).inc()
            start = time.time()
            try:
                return await func(*args, **kwargs)
            finally:
                latency_ms.labels(route).observe((time.time() - start) * 1000)

        return wrapper

    return decorator
