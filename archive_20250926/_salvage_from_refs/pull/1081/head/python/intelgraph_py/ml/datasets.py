from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Edge:
    source: str
    target: str


@dataclass
class GraphSnapshot:
    nodes: list[str]
    edges: list[Edge]


def build_neighbor_map(edges: list[Edge]) -> dict[str, set]:
    nbrs: dict[str, set] = {}
    for e in edges:
        nbrs.setdefault(e.source, set()).add(e.target)
        nbrs.setdefault(e.target, set()).add(e.source)
    return nbrs


def common_neighbors_score(n1: str, n2: str, nbrs: dict[str, set]) -> float:
    a = nbrs.get(n1, set())
    b = nbrs.get(n2, set())
    if not a or not b:
        return 0.0
    common = len(a & b)
    denom = (len(a) + len(b)) or 1
    return common / denom


def suggest_links(snapshot: GraphSnapshot, top_k: int = 20) -> list[tuple[str, str, float]]:
    """Heuristic link suggestions using common neighbors.

    Returns a list of (source, target, score) sorted by score desc.
    """
    existing = {(e.source, e.target) for e in snapshot.edges}
    existing |= {(e.target, e.source) for e in snapshot.edges}
    nbrs = build_neighbor_map(snapshot.edges)
    nodes = snapshot.nodes
    scores: list[tuple[str, str, float]] = []
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            u, v = nodes[i], nodes[j]
            if (u, v) in existing:
                continue
            s = common_neighbors_score(u, v, nbrs)
            if s > 0:
                scores.append((u, v, s))
    scores.sort(key=lambda x: x[2], reverse=True)
    return scores[:top_k]
