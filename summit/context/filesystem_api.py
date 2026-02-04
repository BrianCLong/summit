"""Filesystem abstraction for context offloading and recovery."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Protocol, Sequence


@dataclass(frozen=True)
class FilePreview:
    path: str
    preview: Sequence[str]


class FilesystemAPI(Protocol):
    """Minimal filesystem interface for context management."""

    def ls(self, path: str) -> Sequence[str]:
        """List entries within a path."""

    def read_file(self, path: str, *, max_lines: int | None = None) -> Sequence[str]:
        """Read a file, optionally capped to max_lines."""

    def write_file(self, path: str, content: str) -> None:
        """Write content to a path."""

    def edit_file(self, path: str, *, old: str, new: str) -> None:
        """Apply a text edit to a file."""

    def search(self, path: str, query: str) -> Iterable[FilePreview]:
        """Search for content under a path and return previews."""
