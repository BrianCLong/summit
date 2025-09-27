from typing import List, Dict

import feedparser

from .base import IngestPlugin


class RSSIngestPlugin(IngestPlugin):
    """Ingest plugin for RSS feed data."""

    def parse(self, data: str) -> List[Dict]:
        feed = feedparser.parse(data)
        entries: List[Dict] = []
        for entry in feed.entries:
            entries.append({
                "title": getattr(entry, "title", ""),
                "link": getattr(entry, "link", ""),
            })
        return entries
