"""Retrieval helpers."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .policy import PolicyContext
from .telemetry import TraceEmitter


@dataclass
class RAGContext:
    query: str
    passages: list[dict[str, Any]]
    provenance: list[dict[str, Any]] = field(default_factory=list)
    policy: PolicyContext | None = None


class KnowledgeBase:
    def __init__(self, client: Any, profile: str, *, emitter: TraceEmitter | None = None):
        self.client = client
        self.profile = profile
        self.emitter = emitter or client.emitter if hasattr(client, "emitter") else TraceEmitter()

    def retrieve(
        self,
        query: str,
        *,
        k: int = 5,
        policy: PolicyContext | None = None,
        filters: dict[str, Any] | None = None,
    ) -> RAGContext:
        span = self.emitter.span("rag.retrieve", {"profile": self.profile, "k": k})
        # In v0.1 we mock retrieval for local dev; production adapters plug in vector/graph retrieval.
        passages = [
            {"content": f"Mock passage for '{query}'", "score": 1.0, "filters": filters or {}},
        ]
        provenance = [
            {"source": "mock", "id": "mock-1", "profile": self.profile},
        ]
        span.finish({"results": len(passages)})
        return RAGContext(query=query, passages=passages[:k], provenance=provenance, policy=policy)
