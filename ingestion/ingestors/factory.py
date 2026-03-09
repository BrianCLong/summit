from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from .base import Ingestor
from .github_events import GitHubEventsIngestor
from .http import HTTPIngestor
from .jsonl import JSONLIngestor
from .pastebin import PastebinIngestor
from .stix_taxii import STIXTAXIIIngestor
from .twitter import TwitterIngestor

try:
    from .rss import RSSIngestor
except ImportError:  # pragma: no cover - optional dependency
    RSSIngestor = None  # type: ignore[assignment]


DEFAULT_SOURCES: list[dict[str, Any]] = [
    {"type": "rss", "feed_urls": ["https://example.com/feed"]},
    {"type": "twitter"},
    {"type": "pastebin"},
]


def build_ingestors(
    producer: Any,
    topic: str,
    source_configs: Iterable[dict[str, Any]],
    api_clients: dict[str, Any] | None = None,
) -> list[Ingestor]:
    clients = api_clients or {}
    ingestors: list[Ingestor] = []

    for config in source_configs:
        source_type = config.get("type")
        if source_type == "rss" and RSSIngestor is not None:
            ingestors.append(RSSIngestor(producer, topic, config.get("feed_urls", [])))
        elif source_type == "twitter":
            ingestors.append(TwitterIngestor(producer, topic, clients.get("twitter")))
        elif source_type == "pastebin":
            ingestors.append(PastebinIngestor(producer, topic, clients.get("pastebin")))
        elif source_type == "http":
            ingestors.append(HTTPIngestor(producer, topic, config.get("urls", [])))
        elif source_type == "stix-taxii":
            ingestors.append(
                STIXTAXIIIngestor(
                    producer,
                    topic,
                    config.get("collection_url", ""),
                    config.get("headers", {}),
                )
            )
        elif source_type == "jsonl":
            ingestors.append(JSONLIngestor(producer, topic, config.get("files", [])))
        elif source_type == "github-events":
            ingestors.append(GitHubEventsIngestor(producer, topic, config.get("repositories", [])))

    return ingestors
