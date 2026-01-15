from __future__ import annotations

import uuid
from collections.abc import Sequence
from dataclasses import dataclass, field

import networkx as nx


@dataclass
class Edge:
    source: str
    target: str
    weight: float
    confidence: float = 1.0


@dataclass
class GraphEstimate:
    nodes: list[str]
    edges: list[Edge]

    def to_networkx(self) -> nx.DiGraph:
        g = nx.DiGraph()
        for node in self.nodes:
            g.add_node(node)
        for edge in self.edges:
            g.add_edge(edge.source, edge.target, weight=edge.weight, confidence=edge.confidence)
        return g

    def adjacency(self) -> dict[str, dict[str, float]]:
        table: dict[str, dict[str, float]] = {node: {} for node in self.nodes}
        for edge in self.edges:
            table[edge.source][edge.target] = edge.weight
        return table


@dataclass
class Simulation:
    sim_id: str
    graph: GraphEstimate
    baseline: dict[str, float]
    confidence: float
    history: list[dict[str, float]] = field(default_factory=list)


@dataclass
class PathContribution:
    path: list[str]
    contribution: float


@dataclass
class InterventionResult:
    sim_id: str
    interventions: dict[str, float]
    target: str | None
    delta: dict[str, float]
    projected: dict[str, float]
    paths: list[PathContribution]
    confidence: float


def new_simulation_id() -> str:
    return uuid.uuid4().hex


def topological_sort(graph: GraphEstimate) -> list[str]:
    g = graph.to_networkx()
    return list(nx.topological_sort(g)) if nx.is_directed_acyclic_graph(g) else graph.nodes


def enumerate_paths(
    graph: GraphEstimate, sources: Sequence[str], target: str, limit: int = 5
) -> list[PathContribution]:
    g = graph.to_networkx()
    contributions: list[PathContribution] = []
    for src in sources:
        if src not in g.nodes or target not in g.nodes:
            continue
        for path in nx.all_simple_paths(g, source=src, target=target, cutoff=4):
            weight = 1.0
            for idx in range(len(path) - 1):
                weight *= g[path[idx]][path[idx + 1]].get("weight", 0.0)
            contributions.append(PathContribution(path=path, contribution=weight))
    contributions.sort(key=lambda p: abs(p.contribution), reverse=True)
    return contributions[:limit]


def merge_effects(
    paths: list[PathContribution],
) -> dict[tuple[str, str], float]:
    aggregated: dict[tuple[str, str], float] = {}
    for p in paths:
        if len(p.path) < 2:
            continue
        key = (p.path[0], p.path[-1])
        aggregated[key] = aggregated.get(key, 0.0) + p.contribution
    return aggregated
