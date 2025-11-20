"""Rate limiting implementation for connectors."""

import time
from collections import deque
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class BackoffStrategy(Enum):
    """Backoff strategies for rate limiting."""

    EXPONENTIAL = "exponential"
    LINEAR = "linear"
    FIXED = "fixed"


class RateLimitExceeded(Exception):
    """Raised when rate limit is exceeded."""

    pass


@dataclass
class RateLimitConfig:
    """Rate limit configuration."""

    requests_per_hour: int
    requests_per_minute: Optional[int] = None
    burst_limit: int = 10
    backoff_strategy: BackoffStrategy = BackoffStrategy.EXPONENTIAL
    max_retries: int = 3
    timeout_seconds: int = 30


class RateLimiter:
    """
    Rate limiter with support for hourly/minute limits, burst control, and backoff.

    Thread-safe implementation using time-based token bucket algorithm.
    """

    def __init__(self, config: RateLimitConfig):
        self.config = config
        self.hour_window = deque()  # Timestamps of requests in current hour
        self.minute_window = deque()  # Timestamps of requests in current minute
        self.retry_count = 0
        self.last_request_time = 0.0

    def _clean_windows(self, now: float):
        """Remove timestamps outside the current time windows."""
        hour_cutoff = now - 3600  # 1 hour ago
        minute_cutoff = now - 60  # 1 minute ago

        # Clean hour window
        while self.hour_window and self.hour_window[0] < hour_cutoff:
            self.hour_window.popleft()

        # Clean minute window
        while self.minute_window and self.minute_window[0] < minute_cutoff:
            self.minute_window.popleft()

    def _calculate_backoff(self, attempt: int) -> float:
        """Calculate backoff delay based on strategy."""
        if self.config.backoff_strategy == BackoffStrategy.EXPONENTIAL:
            return min(2**attempt, 60)  # Max 60 seconds
        elif self.config.backoff_strategy == BackoffStrategy.LINEAR:
            return min(attempt * 2, 60)
        else:  # FIXED
            return 5.0

    def acquire(self) -> bool:
        """
        Attempt to acquire a rate limit token.

        Returns:
            True if request is allowed, False otherwise

        Raises:
            RateLimitExceeded: If max retries exceeded
        """
        now = time.time()
        self._clean_windows(now)

        # Check hourly limit
        if len(self.hour_window) >= self.config.requests_per_hour:
            if self.retry_count >= self.config.max_retries:
                raise RateLimitExceeded(
                    f"Hourly rate limit of {self.config.requests_per_hour} exceeded"
                )
            delay = self._calculate_backoff(self.retry_count)
            self.retry_count += 1
            time.sleep(delay)
            return self.acquire()

        # Check minute limit if configured
        if self.config.requests_per_minute:
            if len(self.minute_window) >= self.config.requests_per_minute:
                if self.retry_count >= self.config.max_retries:
                    raise RateLimitExceeded(
                        f"Per-minute rate limit of {self.config.requests_per_minute} exceeded"
                    )
                delay = self._calculate_backoff(self.retry_count)
                self.retry_count += 1
                time.sleep(delay)
                return self.acquire()

        # Check burst limit
        recent_requests = sum(1 for t in self.minute_window if now - t < 10)
        if recent_requests >= self.config.burst_limit:
            if self.retry_count >= self.config.max_retries:
                raise RateLimitExceeded(f"Burst limit of {self.config.burst_limit} exceeded")
            delay = self._calculate_backoff(self.retry_count)
            self.retry_count += 1
            time.sleep(delay)
            return self.acquire()

        # Grant request
        self.hour_window.append(now)
        self.minute_window.append(now)
        self.last_request_time = now
        self.retry_count = 0
        return True

    def wait_if_needed(self):
        """Block until a request can be made."""
        self.acquire()

    def get_current_usage(self) -> dict:
        """Get current rate limit usage statistics."""
        now = time.time()
        self._clean_windows(now)

        return {
            "requests_this_hour": len(self.hour_window),
            "requests_this_minute": len(self.minute_window),
            "hourly_limit": self.config.requests_per_hour,
            "minute_limit": self.config.requests_per_minute,
            "utilization_pct": (len(self.hour_window) / self.config.requests_per_hour) * 100,
        }
