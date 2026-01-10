from __future__ import annotations

import asyncio
import os
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

import asyncpg
import neo4j
import redis.asyncio as aioredis
import yaml

from .circuit_breaker import CircuitBreaker, CircuitBreakerConfig


@dataclass
class RetryConfig:
    max_attempts: int
    backoff_ms: int
    max_backoff_ms: int
    jitter: bool
    retryable_errors: list[str]


with open(
    os.path.join(os.getcwd(), "configs", "data-plane", "defaults.yaml"), encoding="utf-8"
) as f:
    SHARED = yaml.safe_load(f)


async def _backoff(attempt: int, base: int, max_delay: int, jitter: bool) -> None:
    delay = min(max_delay, base * (2**attempt))
    if jitter:
        delay *= 0.5 + os.urandom(1)[0] / 255 / 2
    await asyncio.sleep(delay / 1000)


class PgClient:
    def __init__(self, service: str, store: str = "postgres"):
        cfg = SHARED["postgres"]
        self.pool: asyncpg.Pool = asyncpg.create_pool(
            min_size=cfg["pool"]["min"],
            max_size=cfg["pool"]["max"],
            command_timeout=cfg["timeouts"]["statement_ms"] / 1000,
            timeout=cfg["timeouts"]["lock_ms"] / 1000,
            dsn=os.environ.get("PG_URL"),
        )
        self.retry_cfg = RetryConfig(**cfg["retries"])
        self.breaker = CircuitBreaker(
            CircuitBreakerConfig(
                failure_threshold=cfg["circuit_breaker"]["failure_threshold"],
                recovery_seconds=cfg["circuit_breaker"]["recovery_seconds"],
                p95_budget_ms=cfg["circuit_breaker"]["p95_budget_ms"],
                service=service,
                store=store,
            )
        )

    async def with_conn(self, op: str, func: Callable[[asyncpg.Connection], Awaitable[Any]]) -> Any:
        async with self.pool.acquire() as conn:
            return await self.breaker.execute(op, lambda: self._retrying(func, conn))

    async def _retrying(
        self, func: Callable[[asyncpg.Connection], Awaitable[Any]], conn: asyncpg.Connection
    ) -> Any:
        last_error: Exception | None = None
        for attempt in range(self.retry_cfg.max_attempts):
            try:
                return await func(conn)
            except Exception as err:
                last_error = err
                code = getattr(err, "sqlstate", None)
                if code not in self.retry_cfg.retryable_errors:
                    raise
                await _backoff(
                    attempt,
                    self.retry_cfg.backoff_ms,
                    self.retry_cfg.max_backoff_ms,
                    self.retry_cfg.jitter,
                )
        if last_error:
            raise last_error


class Neo4jClient:
    def __init__(self, service: str, store: str = "neo4j"):
        cfg = SHARED["neo4j"]
        self.driver = neo4j.GraphDatabase.driver(
            os.environ.get("NEO4J_URL", ""),
            auth=(os.environ.get("NEO4J_USER", ""), os.environ.get("NEO4J_PASSWORD", "")),
            max_connection_pool_size=cfg["pool"]["max_connection_pool_size"],
            connection_acquisition_timeout=cfg["pool"]["connection_acquisition_timeout_ms"] / 1000,
            max_transaction_retry_time=cfg["retries"]["max_transaction_retry_ms"] / 1000,
            user_agent="summit/neo4j",
        )
        self.breaker = CircuitBreaker(
            CircuitBreakerConfig(
                failure_threshold=cfg["circuit_breaker"]["failure_threshold"],
                recovery_seconds=cfg["circuit_breaker"]["recovery_seconds"],
                p95_budget_ms=cfg["circuit_breaker"]["p95_budget_ms"],
                service=service,
                store=store,
            )
        )

    def run(
        self, op: str, cypher: str, params: dict[str, Any] | None = None, mode: str = "WRITE"
    ) -> Any:
        session = self.driver.session(
            default_access_mode=neo4j.WRITE_ACCESS if mode == "WRITE" else neo4j.READ_ACCESS
        )
        try:
            return self.breaker.execute(op, lambda: session.run(cypher, params or {}))
        finally:
            session.close()


class RedisClient:
    def __init__(self, service: str, store: str = "redis"):
        cfg = SHARED["redis"]
        self.client = aioredis.from_url(
            os.environ.get("REDIS_URL", ""),
            max_retries_per_request=cfg["connection"]["max_retries_per_request"],
            socket_timeout=cfg["connection"]["command_timeout_ms"] / 1000,
            ssl=cfg["connection"]["tls"],
        )
        self.breaker = CircuitBreaker(
            CircuitBreakerConfig(
                failure_threshold=cfg["circuit_breaker"]["failure_threshold"],
                recovery_seconds=cfg["circuit_breaker"]["recovery_seconds"],
                p95_budget_ms=cfg["circuit_breaker"]["p95_budget_ms"],
                service=service,
                store=store,
            )
        )

    async def exec(self, op: str, func: Callable[[aioredis.Redis], Awaitable[Any]]) -> Any:
        return await self.breaker.execute(op, lambda: func(self.client))
