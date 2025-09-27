"""Disinformation detection and counter-narrative module.

This module identifies coordinated disinformation through semantic
similarity, content duplication and basic source metadata. It also
provides counter-narrative recommendations based on simple behavioral
science principles. SBERT embeddings are used when the
``sentence-transformers`` package is available; otherwise a TF-IDF
fallback is applied for environments without the model.
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

try:  # pragma: no cover - exercised in environments with SBERT installed
    from sentence_transformers import SentenceTransformer

    _HAS_SBERT = True
except Exception:  # pragma: no cover - executed when library missing
    from sklearn.feature_extraction.text import TfidfVectorizer

    _HAS_SBERT = False


logger = logging.getLogger(__name__)


class CounterNarrativeEngine:
    """Generate neutralizing or reframing strategies."""

    @staticmethod
    def recommend(texts: list[str]) -> dict[str, str]:
        """Return simple counter-narrative guidance.

        The strategy is intentionally generic but grounded in
        behavioral-science concepts such as providing factual context and
        encouraging critical evaluation of claims.
        """

        return {
            "reframe": "Present evidence-based information and highlight credible sources.",
            "neutralize": "Encourage critical thinking and verify facts before sharing.",
        }


class DisinformationDetector:
    """Detect coordinated disinformation in a stream of content."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        if _HAS_SBERT:
            self.model = SentenceTransformer(model_name)
            logger.info("Loaded SBERT model %s", model_name)
            self.vectorizer: TfidfVectorizer | None = None
        else:
            self.model = None
            self.vectorizer = TfidfVectorizer()
            logger.warning("sentence-transformers not available; using TF-IDF fallback")

    def _embed(self, texts: list[str]) -> np.ndarray:
        if _HAS_SBERT:
            return self.model.encode(texts)
        assert self.vectorizer is not None
        return self.vectorizer.fit_transform(texts).toarray()

    def _cluster(self, embeddings: np.ndarray, threshold: float = 0.85) -> list[list[int]]:
        """Cluster texts by cosine similarity."""
        sim = cosine_similarity(embeddings)
        n = sim.shape[0]
        visited = set()
        clusters: list[list[int]] = []
        for i in range(n):
            if i in visited:
                continue
            cluster = {i}
            stack = [i]
            while stack:
                idx = stack.pop()
                for j in range(n):
                    if j not in cluster and sim[idx, j] >= threshold:
                        cluster.add(j)
                        stack.append(j)
            if len(cluster) > 1:
                clusters.append(sorted(cluster))
            visited.update(cluster)
        return clusters

    def detect(self, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Return disinformation assessments for coordinated clusters.

        Args:
            items: list of dicts with ``text`` and optional ``metadata``
        """
        if not items:
            return []

        texts = [it["text"] for it in items]
        embeddings = self._embed(texts)
        clusters = self._cluster(embeddings)
        if not clusters:
            return []

        sim = cosine_similarity(embeddings)
        results: list[dict[str, Any]] = []
        for label, idxs in enumerate(clusters):
            cluster_texts = [items[i]["text"] for i in idxs]
            metas = [items[i].get("metadata", {}) for i in idxs]
            sims = sim[np.ix_(idxs, idxs)]
            dup_score = float(np.mean(sims[np.triu_indices_from(sims, 1)])) if len(idxs) > 1 else 0
            bot_scores = [m.get("bot_score", 0.0) for m in metas]
            source_score = float(np.mean(bot_scores)) if bot_scores else 0.0
            confidence = min(1.0, (dup_score + source_score) / 2)
            threat_actors = [m.get("threat_actor") for m in metas if m.get("threat_actor")]
            threat_actor = (
                max(set(threat_actors), key=threat_actors.count) if threat_actors else None
            )
            results.append(
                {
                    "cluster": label,
                    "texts": cluster_texts,
                    "disinfo": True,
                    "confidence": confidence,
                    "threat_actor": threat_actor,
                    "counter_strategy": CounterNarrativeEngine.recommend(cluster_texts),
                }
            )
        return results
