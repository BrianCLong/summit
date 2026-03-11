"""
Base connector contract for the Summit data plane.

All source connectors MUST implement ConnectorBase so the pipeline
runner can treat them uniformly regardless of origin system.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ConnectorRecord:
    """
    A single raw record produced by a connector before normalization.

    ``source_id``   – unique identifier within the source system (e.g. PR number)
    ``record_type`` – e.g. "pull_request", "issue", "push", "workflow_run"
    ``data``        – raw payload from the source
    ``occurred_at`` – ISO-8601 string from the source (may be None)
    ``metadata``    – anything the connector wants to carry alongside the record
    """

    source_id: str
    record_type: str
    data: dict[str, Any]
    occurred_at: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ConnectorSource:
    """Describes an ingestion source returned by discover()."""

    id: str
    name: str
    kind: str  # e.g. "github_repo", "gitlab_project"
    metadata: dict[str, Any] = field(default_factory=dict)


class ConnectorBase(ABC):
    """
    Abstract base for all Summit data-plane source connectors.

    Lifecycle:
        async for record in connector.pull(source):
            process(record)
        await connector.ack(source.id, last_cursor)
    """

    @abstractmethod
    async def discover(self) -> list[ConnectorSource]:
        """Return all sources available under the configured credentials."""

    @abstractmethod
    def pull(self, source: ConnectorSource) -> AsyncIterator[ConnectorRecord]:
        """
        Stream records from a source.  Must be an async generator.
        Implementations should respect the stored checkpoint cursor when present.
        """

    async def ack(self, source_id: str, cursor: str) -> None:
        """
        Acknowledge that all records up to ``cursor`` have been processed.
        Default is a no-op; connectors that support checkpointing should override.
        """

    async def health_check(self) -> bool:
        """Return True if the upstream system is reachable."""
        return True
