"""TTP mining utilities for threat reports.

This module provides a minimal, extensible skeleton for extracting sequences
of adversary actions (TTPs) from unstructured text, normalizing them to
MITRE ATT&CK technique identifiers, and encoding the resulting sequence for
similarity search or clustering.

The implementation is intentionally lightweight so contributors can iterate
quickly. Real deployments should replace the naive logic with production
NLP pipelines and graph walking algorithms.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

try:
    from sentence_transformers import SentenceTransformer
except Exception:  # pragma: no cover - optional dependency
    SentenceTransformer = None

try:  # pragma: no cover - optional dependency
    import networkx as nx
except Exception:  # pragma: no cover - optional dependency
    nx = None

try:  # pragma: no cover - optional dependency
    from sklearn.cluster import DBSCAN
except Exception:  # pragma: no cover - optional dependency
    DBSCAN = None

logger = logging.getLogger(__name__)


@dataclass
class TTPMiner:
    """Extract and embed TTP action sequences."""

    model_name: str = "all-MiniLM-L6-v2"
    mapping: dict[str, str] = field(default_factory=dict)
    encoder: object | None = field(init=False, default=None)

    def __post_init__(self) -> None:
        if SentenceTransformer:
            try:
                self.encoder = SentenceTransformer(self.model_name)
            except Exception as exc:  # pragma: no cover
                logger.warning("Failed to load sentence transformer: %s", exc)
                self.encoder = None
        if not self.mapping:
            # Minimal example mapping; extend as needed.
            self.mapping = {
                "reconnaissance": "TA0043",
                "lateral movement": "TA0008",
                "exfiltration": "TA0010",
            }

    def extract_actions(self, report_text: str) -> list[str]:
        """Naively split text into action phrases.

        This placeholder simply uses periods as delimiters. Real implementations
        should rely on an NLP model to detect verbs and semantic roles.
        """
        actions = [s.strip() for s in report_text.split(".") if s.strip()]
        logger.debug("Extracted actions: %s", actions)
        return actions

    def normalize(self, actions: list[str]) -> list[str]:
        """Map actions to MITRE ATT&CK IDs when available."""
        normalized: list[str] = []
        for act in actions:
            key = act.lower()
            normalized.append(self.mapping.get(key, key))
        logger.debug("Normalized actions: %s", normalized)
        return normalized

    def encode(self, actions: list[str]) -> list[float]:
        """Encode the action sequence into a vector.

        Uses a sentence transformer when available; otherwise returns a simple
        hash based fallback. The output format is a list of floats to keep the
        API backend agnostic.
        """
        sequence = " ".join(actions)
        if self.encoder:
            vector = self.encoder.encode(sequence)
            return vector.tolist()  # type: ignore[return-value]
        # Fallback: deterministic pseudo vector
        hashed = abs(hash(sequence)) % 10**6
        return [float(hashed)]

    def extract_and_encode(self, report_text: str) -> list[float]:
        """Convenience helper to run the full pipeline."""
        actions = self.extract_actions(report_text)
        normalized = self.normalize(actions)
        return self.encode(normalized)

    # ------------------------------------------------------------------
    # Extended helpers

    def extract_from_graph(self, graph: nx.DiGraph, actor: str) -> list[str]:
        """Traverse a graph to collect action names for an actor.

        The graph is expected to contain nodes with a ``type`` attribute of
        ``"Action"`` and optional ``name`` fields. A depth-first search is used
        to gather actions reachable from ``actor`` in traversal order.
        """
        if nx is None:
            raise ImportError("networkx is required for graph extraction")
        actions: list[str] = []
        for node in nx.dfs_preorder_nodes(graph, source=actor):
            if node == actor:
                continue
            if graph.nodes[node].get("type") == "Action":
                actions.append(graph.nodes[node].get("name", str(node)))
        logger.debug("Graph actions for %s: %s", actor, actions)
        return actions

    def cluster(
        self, vectors: list[list[float]], eps: float = 0.5, min_samples: int = 2
    ) -> list[int]:
        """Cluster embedded TTP vectors with DBSCAN.

        Returns a list of cluster labels. Falls back to a single cluster when
        scikit-learn is unavailable.
        """
        if not vectors:
            return []
        if DBSCAN is None:
            logger.warning("scikit-learn not installed; returning single cluster")
            return [0] * len(vectors)
        labels = DBSCAN(eps=eps, min_samples=min_samples).fit(vectors).labels_
        return labels.tolist()  # type: ignore[return-value]

    def cluster_metadata(self, labels: list[int]) -> dict[int, int]:
        """Generate simple cluster size metadata."""
        meta: dict[int, int] = {}
        for label in labels:
            meta[label] = meta.get(label, 0) + 1
        logger.debug("Cluster metadata: %s", meta)
        return meta


__all__ = ["TTPMiner"]
