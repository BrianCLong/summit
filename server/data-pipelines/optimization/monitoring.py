"""Realtime monitoring for pipeline execution."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field

try:  # pragma: no cover - optional dependency
    from aiohttp import web
except ModuleNotFoundError:  # pragma: no cover - fallback for test environments
    from types import SimpleNamespace

    class _Resource:
        def __init__(self, canonical: str) -> None:
            self.canonical = canonical

    class _Route:
        def __init__(self, canonical: str, handler) -> None:  # type: ignore[no-untyped-def]
            self.resource = _Resource(canonical)
            self.handler = handler

    class _Router:
        def __init__(self) -> None:
            self._routes: list[_Route] = []

        def add_get(self, canonical: str, handler) -> _Route:  # type: ignore[no-untyped-def]
            route = _Route(canonical, handler)
            self._routes.append(route)
            return route

        def routes(self) -> list[_Route]:
            return list(self._routes)

    class _Application:
        def __init__(self) -> None:
            self.router = _Router()

    class _Response:
        def __init__(
            self,
            *,
            text: str | None = None,
            body: bytes | None = None,
            content_type: str = "text/plain",
        ) -> None:
            self.text = text
            self.body = body
            self.content_type = content_type

    web = SimpleNamespace(Application=_Application, Response=_Response)
from prometheus_client import CollectorRegistry, Counter, Gauge, Histogram, generate_latest


@dataclass
class PipelineMetrics:
    """In-memory metrics snapshot for dashboards and tests."""

    total_tasks: int = 0
    running_tasks: int = 0
    succeeded_tasks: int = 0
    failed_tasks: int = 0
    retried_tasks: int = 0
    critical_backlog: int = 0
    throughput_per_minute: float = 0.0
    avg_latency_ms: float = 0.0
    last_updated: float = field(default_factory=time.time)

    def as_dict(self) -> dict[str, float]:
        return {
            "total_tasks": float(self.total_tasks),
            "running_tasks": float(self.running_tasks),
            "succeeded_tasks": float(self.succeeded_tasks),
            "failed_tasks": float(self.failed_tasks),
            "retried_tasks": float(self.retried_tasks),
            "critical_backlog": float(self.critical_backlog),
            "throughput_per_minute": float(self.throughput_per_minute),
            "avg_latency_ms": float(self.avg_latency_ms),
            "last_updated": float(self.last_updated),
        }


class PipelineMonitor:
    """Tracks task execution and exposes Prometheus metrics."""

    def __init__(self, registry: CollectorRegistry | None = None) -> None:
        self.registry = registry or CollectorRegistry()
        self._metrics = PipelineMetrics()
        self._latency_samples: list[float] = []
        self._throughput_window: list[float] = []

        self.task_total = Counter(
            "pipeline_tasks_total",
            "Number of pipeline tasks observed",
            registry=self.registry,
        )
        self.task_active = Gauge(
            "pipeline_tasks_active",
            "Number of tasks currently executing",
            registry=self.registry,
        )
        self.task_latency = Histogram(
            "pipeline_task_latency_ms",
            "Task execution latency in milliseconds",
            registry=self.registry,
            buckets=(10, 25, 50, 100, 250, 500, 1000, 2000, 5000),
        )
        self.task_failures = Counter(
            "pipeline_task_failures_total",
            "Number of task failures",
            registry=self.registry,
        )
        self.task_retries = Counter(
            "pipeline_task_retries_total",
            "Number of retries triggered",
            registry=self.registry,
        )

    @property
    def snapshot(self) -> PipelineMetrics:
        return self._metrics

    def record_task_start(self, criticality: str) -> None:
        self._metrics.total_tasks += 1
        self._metrics.running_tasks += 1
        if criticality.lower() in {"blocker", "critical"}:
            self._metrics.critical_backlog += 1
        self.task_total.inc()
        self.task_active.inc()
        self._metrics.last_updated = time.time()

    def record_task_end(
        self, latency_ms: float, *, success: bool, retried: bool, criticality: str
    ) -> None:
        self._metrics.running_tasks = max(self._metrics.running_tasks - 1, 0)
        if criticality.lower() in {"blocker", "critical"}:
            self._metrics.critical_backlog = max(self._metrics.critical_backlog - 1, 0)
        if success:
            self._metrics.succeeded_tasks += 1
        else:
            self._metrics.failed_tasks += 1
            self.task_failures.inc()
        if retried:
            self._metrics.retried_tasks += 1
            self.task_retries.inc()
        self.task_active.dec()
        self.task_latency.observe(latency_ms or 0.001)
        self._latency_samples.append(latency_ms)
        if len(self._latency_samples) > 200:
            self._latency_samples.pop(0)
        self._metrics.avg_latency_ms = sum(self._latency_samples) / len(self._latency_samples)
        now = time.time()
        self._throughput_window.append(now)
        window_start = now - 60
        self._throughput_window = [ts for ts in self._throughput_window if ts >= window_start]
        self._metrics.throughput_per_minute = len(self._throughput_window)
        self._metrics.last_updated = now

    def prometheus_metrics(self) -> bytes:
        return generate_latest(self.registry)


class PipelineDashboard:
    """Lightweight dashboard served via aiohttp."""

    def __init__(self, monitor: PipelineMonitor) -> None:
        self._monitor = monitor

    def _render_index(self) -> str:
        metrics = self._monitor.snapshot.as_dict()
        rows = "".join(
            f"<tr><th>{name}</th><td>{value:.2f}</td></tr>" for name, value in metrics.items()
        )
        return f"""
        <html>
          <head>
            <title>Pipeline Health</title>
            <meta http-equiv="refresh" content="1" />
            <style>
              body {{ font-family: 'Segoe UI', sans-serif; background: #0b1c2c; color: #e8f1ff; }}
              table {{ border-collapse: collapse; margin: 2rem auto; min-width: 420px; }}
              th, td {{ padding: 0.6rem 1rem; border-bottom: 1px solid #1f2f40; text-align: left; }}
              th {{ color: #7dd3fc; }}
              caption {{ font-size: 1.5rem; margin-bottom: 1rem; }}
            </style>
          </head>
          <body>
            <table>
              <caption>Real-time Pipeline Metrics</caption>
              {rows}
            </table>
          </body>
        </html>
        """

    async def handle_index(self, _: web.Request) -> web.Response:
        return web.Response(text=self._render_index(), content_type="text/html")

    async def handle_metrics(self, _: web.Request) -> web.Response:
        payload = json.dumps(self._monitor.snapshot.as_dict())
        return web.Response(text=payload, content_type="application/json")

    async def handle_prometheus(self, _: web.Request) -> web.Response:
        metrics = self._monitor.prometheus_metrics()
        return web.Response(body=metrics, content_type="text/plain; version=0.0.4")

    def build_app(self) -> web.Application:
        app = web.Application()
        app.router.add_get("/", self.handle_index)
        app.router.add_get("/metrics", self.handle_metrics)
        app.router.add_get("/prometheus", self.handle_prometheus)
        return app
