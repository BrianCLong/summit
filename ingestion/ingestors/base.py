from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterable
from typing import Any


class Ingestor(ABC):
    """Base class for OSINT ingestion modules."""

    def __init__(self, producer: Any, topic: str):
        self.producer = producer
        self.topic = topic

    @abstractmethod
    def fetch(self) -> Iterable[dict[str, Any]]:
        """Fetch raw items from the source."""
        raise NotImplementedError

    @abstractmethod
    def normalize(self, item: dict[str, Any]) -> dict[str, Any]:
        """Normalize a raw item into canonical form."""
        raise NotImplementedError

    def emit(self, item: dict[str, Any]) -> None:
        """Emit normalized item to Kafka."""
        if self.producer:
            self.producer.send(self.topic, value=item)

    def run(self) -> None:
        for raw in self.fetch():
            normalized = self.normalize(raw)
            self.emit(normalized)
