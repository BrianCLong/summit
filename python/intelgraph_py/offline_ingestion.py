"""Utility helpers for inspecting the feed-processor's offline Redis queue."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Optional


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _json_default(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    raise TypeError(f"Object of type {type(value)!r} is not JSON serialisable")


@dataclass
class DrainResult:
    processed: int
    requeued: bool
    last_payload: Optional[Dict[str, Any]]


class OfflineIngestionBuffer:
    """Simple Redis-backed queue helper for offline ingestion payloads."""

    def __init__(
        self,
        redis_client: Any,
        key: str = "offline:feed-processor:ingest",
        *,
        max_retries: int = 3,
        dead_letter_key: Optional[str] = None,
    ) -> None:
        self.redis = redis_client
        self.key = key
        self.dead_letter_key = dead_letter_key or f"{key}:dlq"
        self.max_retries = max_retries

    # ------------------------------------------------------------------
    def enqueue(self, payload: Dict[str, Any]) -> None:
        """Store a payload on the offline queue, normalising required fields."""
        entry = dict(payload)
        entry.setdefault("queuedAt", _utc_now_iso())
        entry.setdefault("attempts", int(payload.get("attempts", 0)))
        self.redis.rpush(self.key, json.dumps(entry, default=_json_default))

    # ------------------------------------------------------------------
    def pending(self) -> int:
        """Return the number of pending offline payloads."""
        return int(self.redis.llen(self.key))

    # ------------------------------------------------------------------
    def dead_letter_count(self) -> int:
        """Return the number of payloads currently in the dead-letter queue."""
        return int(self.redis.llen(self.dead_letter_key))

    # ------------------------------------------------------------------
    def drain(self, handler: Callable[[Dict[str, Any]], None]) -> DrainResult:
        """Drain at most one payload and process it with *handler*.

        If the handler raises an exception the payload is requeued with an
        incremented ``attempts`` counter. Once ``attempts`` reaches
        ``max_retries`` the payload is moved to the dead-letter queue.
        """

        processed = 0
        requeued = False
        last_payload: Optional[Dict[str, Any]] = None

        raw = self.redis.lpop(self.key)
        if raw is None:
            return DrainResult(processed=0, requeued=False, last_payload=None)

        payload = json.loads(raw)
        last_payload = payload

        try:
            handler(payload)
            processed = 1
        except Exception as exc:  # noqa: BLE001 - bubble context for tests
            attempts = int(payload.get("attempts", 0)) + 1
            payload["attempts"] = attempts
            payload["last_error"] = str(exc)
            if attempts >= self.max_retries:
                payload["dead_letter"] = True
                self.redis.rpush(self.dead_letter_key, json.dumps(payload, default=_json_default))
            else:
                self.redis.lpush(self.key, json.dumps(payload, default=_json_default))
            requeued = True

        return DrainResult(processed=processed, requeued=requeued, last_payload=last_payload)
