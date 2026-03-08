from .base import Ingestor
from .pastebin import PastebinIngestor

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
    "PastebinIngestor",
    "RSSIngestor",
    "TwitterIngestor",
]
