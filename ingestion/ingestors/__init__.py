from __future__ import annotations

from typing import Any

from .base import Ingestor
from .pastebin import PastebinIngestor

_OPTIONAL_EXPORTS = {"RSSIngestor", "TwitterIngestor"}

__all__ = ["Ingestor", "PastebinIngestor"]


def __getattr__(name: str) -> Any:
    """Lazily import optional ingestors to keep base imports dependency-light."""
    if name == "RSSIngestor":
        from .rss import RSSIngestor

        return RSSIngestor
    if name == "TwitterIngestor":
        from .twitter import TwitterIngestor

        return TwitterIngestor
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__() -> list[str]:
    """Expose optional symbols to discovery tooling without eager imports."""
    return sorted(list(globals().keys()) + list(_OPTIONAL_EXPORTS))
