"""Kafka integration helpers for IG-RL."""

from __future__ import annotations

import json
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class KafkaEvent:
    topic: str
    payload: dict[str, Any]


class EventPublisher:
    """Abstraction over kafka-python to simplify testing."""

    def __init__(self, producer) -> None:
        self._producer = producer

    async def publish(self, events: Iterable[KafkaEvent]) -> None:
        for event in events:
            await self._producer.send(event.topic, json.dumps(event.payload).encode("utf-8"))


class EventConsumer:
    """Pulls Kafka events and forwards them to the trainer."""

    def __init__(self, consumer) -> None:
        self._consumer = consumer

    async def __aiter__(self):  # pragma: no cover - passthrough to kafka consumer
        async for message in self._consumer:
            yield message
