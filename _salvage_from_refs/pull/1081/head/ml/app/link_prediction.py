"""Pluggable link prediction with transformer embeddings.

This module introduces a simple interface for graph embedding backends and
provides a lightweight Transformer-based implementation inspired by
Graph-BERT/NARS-BERT.  Additional embedders can be registered without
modifying the predictor itself.
"""

from __future__ import annotations

from typing import Protocol

import torch
from torch import nn


class NodeEmbedder(Protocol):
    """Protocol describing pluggable node embedding backends."""

    embedding_dim: int
    node_index: dict[str, int]

    def fit(self, edges: list[tuple[str, str]]) -> None: ...

    def get_embedding(self, node: str) -> torch.Tensor: ...


class SimpleEmbedding:
    """Basic trainable embedding similar to Node2Vec."""

    def __init__(self, embedding_dim: int = 32):
        self.embedding_dim = embedding_dim
        self.model: nn.Embedding | None = None
        self.node_index: dict[str, int] = {}

    def fit(self, edges: list[tuple[str, str]]) -> None:
        nodes = set([u for u, v in edges] + [v for u, v in edges])
        self.node_index = {node: idx for idx, node in enumerate(nodes)}
        self.model = nn.Embedding(len(self.node_index), self.embedding_dim)
        optimizer = torch.optim.SGD(self.model.parameters(), lr=0.05)
        edge_idx = torch.tensor(
            [[self.node_index[u], self.node_index[v]] for u, v in edges],
            dtype=torch.long,
        )
        for _ in range(50):
            optimizer.zero_grad()
            u_emb = self.model(edge_idx[:, 0])
            v_emb = self.model(edge_idx[:, 1])
            score = (u_emb * v_emb).sum(dim=1)
            loss = -torch.log(torch.sigmoid(score)).mean()
            loss.backward()
            optimizer.step()

    def get_embedding(self, node: str) -> torch.Tensor:
        if not self.model or node not in self.node_index:
            return torch.zeros(self.embedding_dim)
        idx = self.node_index[node]
        return self.model(torch.tensor([idx]))[0]


class TransformerEmbedding:
    """Transformer-based node encoder.

    This lightweight implementation captures relational structure using a
    ``TransformerEncoder`` applied to randomly initialised node features with
    adjacency-aware bias.  It serves as a stand-in for more sophisticated
    models such as Graph-BERT or NARS-BERT.
    """

    def __init__(self, embedding_dim: int = 32, heads: int = 4):
        self.embedding_dim = embedding_dim
        self.node_index: dict[str, int] = {}
        encoder_layer = nn.TransformerEncoderLayer(d_model=embedding_dim, nhead=heads)
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=2)
        self.embeddings: torch.Tensor | None = None

    def fit(self, edges: list[tuple[str, str]]) -> None:
        nodes = sorted(set([u for u, v in edges] + [v for u, v in edges]))
        self.node_index = {node: idx for idx, node in enumerate(nodes)}

        num_nodes = len(self.node_index)
        adj = torch.zeros(num_nodes, num_nodes)
        for u, v in edges:
            i, j = self.node_index[u], self.node_index[v]
            adj[i, j] = 1.0
            adj[j, i] = 1.0

        features = torch.rand(num_nodes, self.embedding_dim)
        features = features + adj @ torch.rand(num_nodes, self.embedding_dim)
        self.embeddings = self.encoder(features)

    def get_embedding(self, node: str) -> torch.Tensor:
        if self.embeddings is None or node not in self.node_index:
            return torch.zeros(self.embedding_dim)
        return self.embeddings[self.node_index[node]]


class LinkPredictor:
    """Link predictor using a pluggable embedding backend."""

    def __init__(self, embedder: NodeEmbedder | None = None):
        self.embedder: NodeEmbedder = embedder or TransformerEmbedding()

    def fit(self, edges: list[tuple[str, str]]) -> None:
        """Train embeddings from known edges using the configured embedder."""
        self.embedder.fit(edges)

    def predict(self, source: str, candidates: list[str]) -> list[tuple[str, float]]:
        if source not in self.embedder.node_index:
            return []
        src_emb = self.embedder.get_embedding(source)
        preds: list[tuple[str, float]] = []
        for c in candidates:
            if c not in self.embedder.node_index or c == source:
                continue
            dst_emb = self.embedder.get_embedding(c)
            score = torch.sigmoid((src_emb * dst_emb).sum()).item()
            preds.append((c, float(score)))
        preds.sort(key=lambda x: x[1], reverse=True)
        return preds

    def suggest_links(
        self,
        nodes: list[str],
        edges: list[tuple[str, str]],
        source: str,
        top_k: int = 5,
    ) -> list[tuple[str, float]]:
        self.fit(edges)
        existing = {(u, v) for u, v in edges} | {(v, u) for u, v in edges}
        candidates = [n for n in nodes if (source, n) not in existing and n != source]
        return self.predict(source, candidates)[:top_k]


__all__ = [
    "LinkPredictor",
    "NodeEmbedder",
    "SimpleEmbedding",
    "TransformerEmbedding",
]
