"""Memory engine for IntelGraph Copilot.

Stores a chain of interactions between an analyst and the AI copilot.
Each chain is composed of a user action, the AI insight, and the
analyst's response. Memory can be scoped by session and user and is
exportable for retraining or audit.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, List, Optional


@dataclass
class MemoryEvent:
    """Represents a single event with a type and timestamp."""

    type: str
    content: str
    timestamp: datetime


@dataclass
class MemoryChain:
    """A chain of interactions: user action -> AI insight -> analyst response."""

    user_action: Optional[MemoryEvent] = None
    ai_insight: Optional[MemoryEvent] = None
    analyst_response: Optional[MemoryEvent] = None


class InMemoryStore:
    """Simple in-memory storage backend.

    The store keeps memory chains per ``session_id`` and ``user_id`` key.
    In a production system this could be backed by Redis or Postgres.
    """

    def __init__(self) -> None:
        self._store: Dict[str, List[MemoryChain]] = {}

    def save(self, session_id: str, user_id: str, chains: List[MemoryChain]) -> None:
        key = f"{session_id}:{user_id}"
        self._store[key] = chains

    def load(self, session_id: str, user_id: str) -> List[MemoryChain]:
        key = f"{session_id}:{user_id}"
        return self._store.get(key, [])


class CopilotMemory:
    """High level API for interacting with the copilot memory."""

    def __init__(self, store: Optional[InMemoryStore] = None) -> None:
        self.store = store or InMemoryStore()

    # Internal helpers -------------------------------------------------
    def _get_chains(self, session_id: str, user_id: str) -> List[MemoryChain]:
        return list(self.store.load(session_id, user_id))

    def _save_chains(self, session_id: str, user_id: str, chains: List[MemoryChain]) -> None:
        self.store.save(session_id, user_id, chains)

    # Public API -------------------------------------------------------
    def add_user_action(self, session_id: str, user_id: str, content: str) -> None:
        """Start a new chain with a user action."""
        chains = self._get_chains(session_id, user_id)
        chains.append(
            MemoryChain(
                user_action=MemoryEvent("user_action", content, datetime.utcnow())
            )
        )
        self._save_chains(session_id, user_id, chains)

    def add_ai_insight(self, session_id: str, user_id: str, content: str) -> None:
        """Attach an AI insight to the most recent chain."""
        chains = self._get_chains(session_id, user_id)
        if not chains:
            chains.append(MemoryChain())
        chains[-1].ai_insight = MemoryEvent("ai_insight", content, datetime.utcnow())
        self._save_chains(session_id, user_id, chains)

    def add_analyst_response(
        self, session_id: str, user_id: str, content: str
    ) -> None:
        """Attach an analyst response to the most recent chain."""
        chains = self._get_chains(session_id, user_id)
        if not chains:
            chains.append(MemoryChain())
        chains[-1].analyst_response = MemoryEvent(
            "analyst_response", content, datetime.utcnow()
        )
        self._save_chains(session_id, user_id, chains)

    def get_memory_chain(self, session_id: str, user_id: str) -> List[MemoryChain]:
        """Return the list of memory chains for the session and user."""
        return self._get_chains(session_id, user_id)

    def export_memory(self, session_id: str, user_id: str) -> List[Dict[str, dict]]:
        """Export memory chains as dictionaries for serialization."""
        chains = self._get_chains(session_id, user_id)
        return [asdict(chain) for chain in chains]

