"""Graph Time-Series Forecasting utilities.

This module provides a small wrapper around a temporal graph neural
network (e.g. `TGAT` or `DySAT`) for link prediction.  The current
implementation is intentionally lightweight and serves as a placeholder
for a full model.  It exposes two main methods: :meth:`ingest_subgraph`
for loading time stamped edges from Neo4j and :meth:`predict_edges`
which returns a list of predicted future edges with confidences.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from hashlib import sha1
from typing import Iterable, List, Tuple

import torch


@dataclass
class EdgePrediction:
    """Container for a predicted edge."""

    source: str
    target: str
    timestamp: datetime
    confidence: float


class GraphForecaster:
    """Forecast future edges using a temporal graph network.

    Parameters
    ----------
    embedding_dim:
        Size of node embeddings.  The default is intentionally small so
        the module can run in lightweight environments.
    """

    def __init__(self, embedding_dim: int = 32) -> None:
        self.embedding_dim = embedding_dim
        # Placeholder "model"; in a real implementation this would be a
        # TGAT, DySAT, or similar temporal GNN.  We keep a tiny neural
        # network so the interface can be exercised in tests.
        self.model = torch.nn.Linear(embedding_dim, 1)
        # Store full edge history so simple frequency based heuristics can
        # be computed for predictions.
        self._edges: List[Tuple[str, str, datetime]] = []
        self._pair_counts: dict[Tuple[str, str], int] = {}

    def ingest_subgraph(self, edges: Iterable[Tuple[str, str, datetime]]) -> None:
        """Load a time ordered set of edges.

        Parameters
        ----------
        edges:
            Iterable of ``(source, target, timestamp)`` tuples.
        """

        self._edges = sorted(edges, key=lambda e: e[2])
        self._pair_counts = {}
        for src, dst, _ in self._edges:
            key = (src, dst)
            self._pair_counts[key] = self._pair_counts.get(key, 0) + 1

    def predict_edges(self, future_days: int = 30) -> List[EdgePrediction]:
        """Predict future edges for the next ``future_days`` days.

        This dummy implementation simply echoes the last seen edge into
        the future with a decaying confidence score.  It is sufficient
        for unit tests and serves as a scaffold for more advanced
        temporal models.
        """

        if not self._edges:
            return []

        total_edges = len(self._edges)
        last_ts = self._edges[-1][2]
        predictions: List[EdgePrediction] = []
        for (src, dst), count in self._pair_counts.items():
            base_conf = count / total_edges
            for day in range(1, future_days + 1):
                ts = last_ts + timedelta(days=day)
                # simple exponential decay so further forecasts are less confident
                confidence = max(0.0, min(1.0, base_conf * (0.95 ** (day - 1))))
                predictions.append(EdgePrediction(source=src, target=dst, timestamp=ts, confidence=confidence))
        return predictions
