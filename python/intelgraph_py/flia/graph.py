"""Graph representation for FLIA lineage computations."""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Dict, Iterable, List, MutableMapping, Set

from .models import LineageNode


def _infer_type(identifier: str) -> str:
    if ":" in identifier:
        return identifier.split(":", 1)[0]
    return "unknown"


def _infer_name(identifier: str) -> str:
    if ":" in identifier:
        return identifier.split(":", 1)[1]
    return identifier


@dataclass(slots=True)
class LineageGraph:
    """A directed graph capturing dependencies between lineage nodes."""

    nodes: Dict[str, LineageNode]
    downstream: MutableMapping[str, Set[str]]
    upstream: MutableMapping[str, Set[str]]

    def __init__(self) -> None:
        self.nodes = {}
        self.downstream = defaultdict(set)
        self.upstream = defaultdict(set)

    def ensure_node(self, identifier: str, *, type_hint: str | None = None) -> LineageNode:
        """Ensure that a node exists, creating a placeholder if required."""

        if identifier not in self.nodes:
            node_type = type_hint or _infer_type(identifier)
            node = LineageNode(id=identifier, type=node_type, name=_infer_name(identifier))
            self.add_node(node)
        return self.nodes[identifier]

    def add_node(self, node: LineageNode) -> None:
        self.nodes[node.id] = node
        self.downstream.setdefault(node.id, set())
        self.upstream.setdefault(node.id, set())

    def add_dependency(self, source: str, target: str) -> None:
        """Add a directed edge indicating that *target* depends on *source*."""

        self.ensure_node(source)
        self.ensure_node(target)
        self.downstream[source].add(target)
        self.upstream[target].add(source)

    def downstream_of(self, start: str | Iterable[str]) -> List[str]:
        """Return all nodes that transitively depend on *start*."""

        if isinstance(start, str):
            frontier = deque([start])
        else:
            frontier = deque(start)
        visited: Set[str] = set()
        while frontier:
            current = frontier.popleft()
            for neighbour in sorted(self.downstream.get(current, set())):
                if neighbour not in visited:
                    visited.add(neighbour)
                    frontier.append(neighbour)
        return sorted(visited)

    def upstream_of(self, node_id: str) -> Set[str]:
        return set(self.upstream.get(node_id, set()))

    def induced_subgraph(self, node_ids: Iterable[str]) -> Dict[str, Set[str]]:
        """Return downstream adjacency restricted to *node_ids*."""

        node_set = set(node_ids)
        return {
            node_id: {child for child in self.downstream.get(node_id, set()) if child in node_set}
            for node_id in node_set
        }
