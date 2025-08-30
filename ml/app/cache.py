from __future__ import annotations

"""Caching utilities for graph analytics using Redis."""

import hashlib
import json
import logging
import os
from collections.abc import Iterable
from typing import Any

from redis.asyncio import Redis
from redis.exceptions import RedisError

from .monitoring import track_cache_operation, track_error

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CACHE_TTL = int(os.getenv("COMMUNITY_CACHE_TTL", "3600"))
_CACHE_PREFIX = "community:"

_redis_client: Redis | None = None


async def get_client() -> Redis:
    """Get or create the Redis client."""
    global _redis_client
    if _redis_client is None:
        _redis_client = Redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
    return _redis_client


def fingerprint_graph(edges: Iterable[tuple[Any, Any]], algorithm: str, resolution: float) -> str:
    """Create a stable fingerprint for a graph."""
    edge_strings = [f"{min(u, v)}-{max(u, v)}" for u, v in edges]
    edge_strings.sort()
    base = f"{algorithm}|{resolution}|" + "|".join(edge_strings)
    return hashlib.sha256(base.encode("utf-8")).hexdigest()


async def get_cached_communities(fingerprint: str) -> dict[str, Any] | None:
    """Fetch cached community detection result if available."""
    try:
        client = await get_client()
        cached = await client.get(_CACHE_PREFIX + fingerprint)
        if cached:
            track_cache_operation("community_detect", True)
            return json.loads(cached)
        track_cache_operation("community_detect", False)
    except RedisError as exc:
        logger.warning("Redis error during cache fetch: %s", exc)
        track_error("cache", type(exc).__name__)
    return None


async def set_cached_communities(fingerprint: str, value: dict[str, Any]) -> None:
    """Store community detection result in cache."""
    try:
        client = await get_client()
        await client.set(_CACHE_PREFIX + fingerprint, json.dumps(value), ex=CACHE_TTL)
    except RedisError as exc:
        logger.warning("Redis error during cache store: %s", exc)
        track_error("cache", type(exc).__name__)
