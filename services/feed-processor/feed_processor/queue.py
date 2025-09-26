"""Redis-backed queue utilities for batching feed ingestion."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Iterable, List, Optional

from redis import asyncio as redis_async


@dataclass(slots=True)
class QueueStats:
    """Basic queue telemetry returned by :class:`RedisBatchQueue`."""

    name: str
    pending: int


class RedisBatchQueue:
    """High-throughput Redis queue optimized for batch operations."""

    def __init__(
        self,
        redis_url: str,
        queue_name: str,
        *,
        redis_client: Optional[redis_async.Redis] = None,
    ) -> None:
        self._queue = queue_name
        self._redis = redis_client or redis_async.from_url(
            redis_url, encoding="utf-8", decode_responses=True
        )

    @property
    def redis(self) -> redis_async.Redis:
        return self._redis

    async def enqueue_many(self, items: Iterable[dict[str, Any]]) -> int:
        """Push a collection of items onto the queue in FIFO order."""

        payload = [json.dumps(item) for item in items]
        if not payload:
            return 0
        return await self._redis.rpush(self._queue, *payload)

    async def dequeue_batch(self, batch_size: int, timeout: float) -> list[dict[str, Any]]:
        """Pop up to ``batch_size`` items, blocking until at least one arrives."""

        if batch_size <= 0:
            return []

        result = await self._redis.blpop(self._queue, timeout=timeout)
        if not result:
            return []

        _, raw_first = result
        items: list[dict[str, Any]] = [json.loads(raw_first)]

        remaining = batch_size - 1
        if remaining <= 0:
            return items

        extra = await self._redis.lpop(self._queue, remaining)
        if extra:
            if isinstance(extra, str):
                items.append(json.loads(extra))
            else:
                items.extend(json.loads(value) for value in extra)
        return items

    async def pending(self) -> QueueStats:
        """Return the approximate queue depth."""

        length = await self._redis.llen(self._queue)
        return QueueStats(name=self._queue, pending=length)

    async def purge(self) -> None:
        """Remove all pending work from the queue."""

        await self._redis.delete(self._queue)

    async def close(self) -> None:
        """Close the underlying Redis connection."""

        await self._redis.aclose()
