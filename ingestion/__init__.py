from __future__ import annotations

from typing import Any

from .ingestors import Ingestor, PastebinIngestor

_OPTIONAL_EXPORTS = {"RSSIngestor", "TwitterIngestor"}

__all__ = ["Ingestor", "PastebinIngestor"]


def __getattr__(name: str) -> Any:
    """Expose optional ingestors without importing optional dependencies eagerly."""
    if name in _OPTIONAL_EXPORTS:
        from . import ingestors

        return getattr(ingestors, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__() -> list[str]:
    """Expose optional symbols to discovery tooling without eager imports."""
    return sorted(list(globals().keys()) + list(_OPTIONAL_EXPORTS))
