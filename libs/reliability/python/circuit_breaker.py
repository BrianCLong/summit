import time
from collections.abc import Callable
from dataclasses import dataclass
from enum import Enum
from typing import Generic, TypeVar

from prometheus_client import Counter, Gauge, Histogram

T = TypeVar("T")


class State(str, Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half-open"


@dataclass
class CircuitBreakerConfig:
    failure_threshold: int
    recovery_seconds: int
    p95_budget_ms: int
    service: str
    store: str


state_gauge = Gauge(
    "db_cb_state",
    "Circuit breaker state (0=closed,1=open,2=half-open)",
    ["service", "store"],
)
latency_hist = Histogram(
    "db_query_latency_seconds",
    "Latency histogram for DB calls",
    ["store", "op"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.15, 0.25, 0.5, 1, 2, 3],
)
error_counter = Counter("db_errors_total", "Total DB errors", ["store", "code"])


class CircuitBreaker(Generic[T]):
    def __init__(self, config: CircuitBreakerConfig):
        self.config = config
        self.failures = 0
        self.state = State.CLOSED
        self._next_probe_at: float | None = None
        self._update_gauge()

    def execute(self, op: str, func: Callable[[], T]) -> T:
        if self.state == State.OPEN and (
            self._next_probe_at is None or time.time() < self._next_probe_at
        ):
            error_counter.labels(store=self.config.store, code="circuit_open").inc()
            raise RuntimeError("Circuit breaker open")
        start = time.perf_counter()
        try:
            result = func()
            self._record_latency(op, start)
            self._reset()
            return result
        except Exception as err:
            self.failures += 1
            error_counter.labels(store=self.config.store, code="operation_failed").inc()
            self._record_latency(op, start)
            if self.failures >= self.config.failure_threshold:
                self._trip()
            raise err

    def _trip(self) -> None:
        self.state = State.OPEN
        self._next_probe_at = time.time() + self.config.recovery_seconds
        self._update_gauge()

    def _reset(self) -> None:
        self.failures = 0
        if self.state != State.CLOSED:
            self.state = State.CLOSED
            self._update_gauge()

    def _record_latency(self, op: str, start: float) -> None:
        latency_hist.labels(store=self.config.store, op=op).observe(time.perf_counter() - start)

    def _update_gauge(self) -> None:
        state_value = 0 if self.state == State.CLOSED else 1 if self.state == State.OPEN else 2
        state_gauge.labels(service=self.config.service, store=self.config.store).set(state_value)
