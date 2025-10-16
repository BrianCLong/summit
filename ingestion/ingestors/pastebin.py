from collections.abc import Iterable
from typing import Any

from .base import Ingestor


class PastebinIngestor(Ingestor):
    def __init__(self, producer: Any, topic: str, api_client: Any):
        super().__init__(producer, topic)
        self.api_client = api_client

    def fetch(self) -> Iterable[dict[str, Any]]:
        for paste in getattr(self.api_client, "recent_pastes", lambda: [])():
            yield paste

    def normalize(self, item: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": item.get("key"),
            "platform": "pastebin",
            "timestamp": item.get("date"),
            "text": item.get("content", ""),
            "metadata": {"title": item.get("title")},
        }
