from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterable
from typing import IO, Any


class BaseConnector(ABC):
    """Interface for batch ingestion connectors."""

    @abstractmethod
    def discover(self) -> Iterable[dict[str, Any]]:
        """Discover available data sources."""
        raise NotImplementedError

    @abstractmethod
    def preview(self, n: int) -> Iterable[dict[str, Any]]:
        """Return an iterator over a preview of *n* records."""
        raise NotImplementedError

    @abstractmethod
    def ingest(self, stream: IO[str]) -> None:
        """Stream newline-delimited JSON to *stream*."""
        raise NotImplementedError

    @abstractmethod
    def emit(self, path: str) -> None:
        """Emit a manifest JSON file for this connector to *path*."""
        raise NotImplementedError
