"""
Deterministic motif miner (triangle and path motifs) for snapshot graphs.
Read-only: consumes in-memory graphs and emits reusable motif definitions.
"""
from __future__ import annotations

import random
from collections import defaultdict
from dataclasses import dataclass
from typing import DefaultDict, Dict, Iterable, List, Set, Tuple


class SimpleGraph:
    """Minimal undirected graph helper to avoid external dependencies."""

    def __init__(self) -> None:
        self._adj: DefaultDict[int, Set[int]] = defaultdict(set)

    def add_edge(self, a: int, b: int) -> None:
        if a == b:
            return
        self._adj[a].add(b)
        self._adj[b].add(a)

    def add_edges_from(self, edges: Iterable[Tuple[int, int]]) -> None:
        for a, b in edges:
            self.add_edge(a, b)

    def nodes(self) -> List[int]:
        return list(self._adj.keys())

    def neighbors(self, node: int) -> Set[int]:
        return set(self._adj.get(node, set()))

    def has_edge(self, a: int, b: int) -> bool:
        return b in self._adj.get(a, set())


@dataclass
class MiningConfig:
    seed: int = 42
    min_support: int = 1
    max_nodes: int = 5


class MotifMiner:
    def __init__(self, config: MiningConfig | None = None):
        self.config = config or MiningConfig()
        random.seed(self.config.seed)

    def mine(self, graph: SimpleGraph) -> Dict[str, List[Tuple[int, ...]]]:
        """Return discovered motifs keyed by motif type with node tuples."""
        motifs: Dict[str, List[Tuple[int, ...]]] = {
            "triangle": [],
            "path3": [],
        }

        nodes = sorted(graph.nodes())

        # Triangle motifs (3-cliques)
        for i, a in enumerate(nodes):
            for j in range(i + 1, len(nodes)):
                b = nodes[j]
                if not graph.has_edge(a, b):
                    continue
                for k in range(j + 1, len(nodes)):
                    c = nodes[k]
                    if graph.has_edge(a, c) and graph.has_edge(b, c):
                        motif_nodes = tuple(sorted((a, b, c)))
                        if self._within_limit(motif_nodes):
                            motifs["triangle"].append(motif_nodes)

        # Path motifs of length 3 (3 nodes, 2 edges without closing triangle)
        for center in nodes:
            neighbors = sorted(graph.neighbors(center))
            for i, n1 in enumerate(neighbors):
                for n2 in neighbors[i + 1 :]:
                    if n1 != n2 and not graph.has_edge(n1, n2):
                        path = tuple(sorted([center, n1, n2]))
                        if self._within_limit(path):
                            motifs["path3"].append(path)

        # Deduplicate and enforce min_support deterministically
        for key, vals in motifs.items():
            counts: Dict[Tuple[int, ...], int] = {}
            for v in vals:
                counts[v] = counts.get(v, 0) + 1
            motifs[key] = [motif for motif, count in counts.items() if count >= self.config.min_support]
        return motifs

    def explain(self, graph: SimpleGraph, motifs: Dict[str, List[Tuple[int, ...]]]) -> Dict[str, List[str]]:
        """Provide simple explanations per motif instance (paths + strength)."""
        explanations: Dict[str, List[str]] = {}
        for motif_type, instances in motifs.items():
            explanations[motif_type] = []
            for inst in instances:
                strength = self._strength(graph, inst)
                path_repr = " -> ".join(map(str, inst))
                explanations[motif_type].append(f"{motif_type}:{path_repr} (strength={strength:.2f})")
        return explanations

    def _strength(self, graph: SimpleGraph, nodes: Tuple[int, ...]) -> float:
        edges = 0
        node_list = list(nodes)
        for i, a in enumerate(node_list):
            for b in node_list[i + 1 :]:
                if graph.has_edge(a, b):
                    edges += 1
        return edges / max(1, len(nodes))

    def _within_limit(self, nodes: Iterable[int]) -> bool:
        return len(list(nodes)) <= self.config.max_nodes
