"""Integration tests for offline ingestion helpers."""

from __future__ import annotations

import json
from typing import Dict

import fakeredis
import pytest

from intelgraph_py.offline_ingestion import OfflineIngestionBuffer


@pytest.fixture()
def redis_buffer() -> OfflineIngestionBuffer:
    client = fakeredis.FakeRedis(decode_responses=True)
    return OfflineIngestionBuffer(client)


def test_enqueue_sets_defaults(redis_buffer: OfflineIngestionBuffer) -> None:
    redis_buffer.enqueue({"job": {"job_id": "abc"}})

    assert redis_buffer.pending() == 1

    raw = redis_buffer.redis.lindex(redis_buffer.key, 0)
    payload = json.loads(raw)
    assert payload["queuedAt"]
    assert payload["attempts"] == 0


def test_drain_processes_payload(redis_buffer: OfflineIngestionBuffer) -> None:
    observed: Dict[str, Dict] = {}

    redis_buffer.enqueue({"job": {"job_id": "abc"}})

    result = redis_buffer.drain(lambda payload: observed.setdefault("payload", payload))

    assert result.processed == 1
    assert result.requeued is False
    assert observed["payload"]["job"]["job_id"] == "abc"
    assert redis_buffer.pending() == 0


def test_drain_requeues_on_error() -> None:
    client = fakeredis.FakeRedis(decode_responses=True)
    buffer = OfflineIngestionBuffer(client, max_retries=2)
    buffer.enqueue({"job": {"job_id": "abc"}})

    # First failure should requeue the payload with attempts incremented
    def raise_error(payload: Dict) -> None:  # noqa: ANN001 - test helper
        raise RuntimeError("boom")

    result1 = buffer.drain(raise_error)
    assert result1.requeued is True
    queued = json.loads(client.lindex(buffer.key, 0))
    assert queued["attempts"] == 1

    # Second failure moves it to the dead-letter queue
    result2 = buffer.drain(raise_error)
    assert result2.requeued is True
    assert buffer.pending() == 0
    assert buffer.dead_letter_count() == 1
