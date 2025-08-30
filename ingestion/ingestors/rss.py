from collections.abc import Iterable
from typing import Any

import feedparser

from .base import Ingestor


class RSSIngestor(Ingestor):
    def __init__(self, producer: Any, topic: str, feed_urls: Iterable[str]):
        super().__init__(producer, topic)
        self.feed_urls = list(feed_urls)

    def fetch(self) -> Iterable[dict[str, Any]]:
        for url in self.feed_urls:
            parsed = feedparser.parse(url)
            for entry in parsed.entries:
                yield entry

    def normalize(self, item: dict[str, Any]) -> dict[str, Any]:
        external_id = item.get("id", item.get("link"))
        return {
            "id": external_id,
            "external_id": external_id,
            "platform": "rss",
            "timestamp": item.get("published_parsed"),
            "text": item.get("title", ""),
            "metadata": {"source": item.get("link")},
        }
