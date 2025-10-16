from .base import Ingestor
from .pastebin import PastebinIngestor
from .rss import RSSIngestor
from .twitter import TwitterIngestor

__all__ = ["Ingestor", "RSSIngestor", "TwitterIngestor", "PastebinIngestor"]
