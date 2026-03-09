from __future__ import annotations

from collections.abc import Iterable
from typing import Any

import requests

from .base import Ingestor


class HTTPIngestor(Ingestor):
    """Fetch JSON items from HTTP endpoints."""

    def __init__(self, producer: Any, topic: str, urls: Iterable[str]):
        super().__init__(producer, topic)
        self.urls: list[str] = list(urls)

    def fetch(self) -> Iterable[dict[str, Any]]:
        for url in self.urls:
            resp = requests.get(url, timeout=10)
            data = resp.json()
            if isinstance(data, list):
                for item in data:
                    yield item
            else:
                yield data

    def normalize(self, item: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": item.get("id") or hash(str(item)),
            "platform": "http",
            "timestamp": item.get("timestamp"),
            "text": item.get("text", ""),
            "metadata": {"source": item.get("source")},
        }
