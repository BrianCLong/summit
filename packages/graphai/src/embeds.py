"""Simple spectral embedding training utilities."""

from __future__ import annotations

import networkx as nx
import numpy as np


def train_node2vec(edges: list[tuple[int, int]], dim: int = 8) -> dict[int, list[float]]:
    """Train a very small embedding model via adjacency SVD.

    This is not a full Node2Vec implementation but provides deterministic
    embeddings adequate for tests. For real use, replace with a proper
    random‑walk based algorithm.
    """
    graph = nx.Graph()
    graph.add_edges_from(edges)
    nodes = sorted(graph.nodes())
    adj = nx.to_numpy_array(graph, nodelist=nodes)
    u, s, _ = np.linalg.svd(adj)
    emb = u[:, :dim]
    return {node: emb[i].tolist() for i, node in enumerate(nodes)}
