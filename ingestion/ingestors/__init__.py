from .base import Ingestor
from .factory import DEFAULT_SOURCES, build_ingestors
from .github_events import GitHubEventsIngestor
from .http import HTTPIngestor
from .jsonl import JSONLIngestor
from .pastebin import PastebinIngestor
from .stix_taxii import STIXTAXIIIngestor

try:
    from .rss import RSSIngestor
except ImportError:  # pragma: no cover - optional dependency
    RSSIngestor = None  # type: ignore[assignment]

try:
    from .twitter import TwitterIngestor
except ImportError:  # pragma: no cover - optional dependency
    TwitterIngestor = None  # type: ignore[assignment]

__all__ = [
    "Ingestor",
    "build_ingestors",
    "DEFAULT_SOURCES",
    "PastebinIngestor",
    "RSSIngestor",
    "TwitterIngestor",
    "HTTPIngestor",
    "STIXTAXIIIngestor",
    "JSONLIngestor",
    "GitHubEventsIngestor",
]
