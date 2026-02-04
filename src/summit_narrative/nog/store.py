from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Protocol

from .model import Edge, NarrativeOperatingGraph, Node


class GraphStore(Protocol):
    def upsert_nodes(self, nodes: Iterable[Node]) -> None: ...

    def upsert_edges(self, edges: Iterable[Edge]) -> None: ...

    def snapshot(self, version: str) -> NarrativeOperatingGraph: ...


@dataclass
class InMemoryGraphStore:
    nodes: dict[str, Node] = field(default_factory=dict)
    edges: list[Edge] = field(default_factory=list)

    def upsert_nodes(self, nodes: Iterable[Node]) -> None:
        for node in nodes:
            self.nodes[node.id] = node

    def upsert_edges(self, edges: Iterable[Edge]) -> None:
        for edge in edges:
            self.edges.append(edge)

    def snapshot(self, version: str) -> NarrativeOperatingGraph:
        return NarrativeOperatingGraph(
            nodes=list(self.nodes.values()),
            edges=list(self.edges),
            version=version,
        )
