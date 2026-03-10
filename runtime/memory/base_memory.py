"""Base interfaces for runtime memory implementations."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Dict, List

MemoryEntry = dict[str, str]
MemorySnapshot = dict[str, object]


class BaseMemory(ABC):
    """Contract for deterministic memory adapters."""

    @abstractmethod
    def add(self, role: str, content: str) -> None:
        """Add an entry to memory."""

    @abstractmethod
    def snapshot(self) -> MemorySnapshot:
        """Return deterministic memory state."""

    @abstractmethod
    def entries(self) -> list[MemoryEntry]:
        """Return current entries in deterministic order."""
