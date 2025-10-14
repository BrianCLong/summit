"""Resilience primitives used by the optimizer."""

from __future__ import annotations

import random
import time
from dataclasses import dataclass
from typing import Any, Callable, Optional, Protocol, Tuple, Type, TypeVar

T = TypeVar("T")


class RetryError(RuntimeError):
    pass


class SupportsCall(Protocol[T]):  # pragma: no cover - Protocol container
    def __call__(self, *args: Any, **kwargs: Any) -> T:
        ...


@dataclass
class CircuitBreaker:
    failure_threshold: int = 5
    recovery_timeout: float = 30.0
    half_open_success_threshold: int = 2

    def __post_init__(self) -> None:
        self._failure_count = 0
        self._opened_at: Optional[float] = None
        self._half_open_success = 0

    def _in_open_state(self) -> bool:
        if self._opened_at is None:
            return False
        return (time.time() - self._opened_at) < self.recovery_timeout

    def _transition_to_half_open(self) -> None:
        self._opened_at = None
        self._half_open_success = 0

    def allow(self) -> bool:
        if not self._in_open_state():
            if self._opened_at is None:
                return True
            self._transition_to_half_open()
            return True
        return False

    def record_success(self) -> None:
        if self._opened_at is not None:
            self._half_open_success += 1
            if self._half_open_success >= self.half_open_success_threshold:
                self._opened_at = None
                self._failure_count = 0
        else:
            self._failure_count = 0

    def record_failure(self) -> None:
        self._failure_count += 1
        if self._failure_count >= self.failure_threshold:
            self._opened_at = time.time()


def retry_with_backoff(
    func: SupportsCall[T],
    *,
    retries: int = 3,
    base_delay: float = 0.2,
    max_delay: float = 2.0,
    jitter: float = 0.1,
    circuit_breaker: Optional[CircuitBreaker] = None,
    retry_exceptions: Tuple[Type[BaseException], ...] = (Exception,),
    on_retry: Optional[Callable[[int, float], None]] = None,
) -> T:
    """Execute ``func`` with exponential backoff and optional circuit breaking."""

    attempt = 0
    delay = base_delay
    while True:
        attempt += 1
        if circuit_breaker and not circuit_breaker.allow():
            raise RetryError("Circuit breaker open")
        try:
            result = func()
        except retry_exceptions as exc:  # type: ignore[misc]
            if circuit_breaker:
                circuit_breaker.record_failure()
            if attempt > retries:
                raise RetryError("Maximum retries exceeded") from exc
            sleep_time = min(delay, max_delay)
            sleep_time += random.uniform(-jitter, jitter)
            sleep_time = max(0.0, sleep_time)
            if on_retry:
                on_retry(attempt, sleep_time)
            time.sleep(sleep_time)
            delay *= 2
        else:
            if circuit_breaker:
                circuit_breaker.record_success()
            return result
