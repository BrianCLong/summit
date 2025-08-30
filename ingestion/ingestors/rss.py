from typing import Any, Dict, Iterable
import feedparser
from .base import Ingestor

class RSSIngestor(Ingestor):
    def __init__(self, producer: Any, topic: str, feed_urls: Iterable[str]):
        super().__init__(producer, topic)
        self.feed_urls = list(feed_urls)

    def fetch(self) -> Iterable[Dict[str, Any]]:
        for url in self.feed_urls:
            parsed = feedparser.parse(url)
            for entry in parsed.entries:
                yield entry

    def normalize(self, item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": item.get("id", item.get("link")),
            "platform": "rss",
            "timestamp": item.get("published_parsed"),
            "text": item.get("title", ""),
            "metadata": {"source": item.get("link")},
        }
