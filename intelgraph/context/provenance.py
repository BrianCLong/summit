from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from .types import ContextSegment, ContextSegmentId


@dataclass(slots=True)
class ProvenanceNode:
    id: ContextSegmentId
    segment: ContextSegment
    parents: List[ContextSegmentId] = field(default_factory=list)
    children: List[ContextSegmentId] = field(default_factory=list)


@dataclass(slots=True)
class ProvenanceEdge:
    from_id: ContextSegmentId
    to_id: ContextSegmentId
    relation: str


class ContextProvenanceGraph:
    def __init__(self, graph_id: str):
        self.graph_id = graph_id
        self._nodes: Dict[ContextSegmentId, ProvenanceNode] = {}
        self._edges: List[ProvenanceEdge] = []

    def add_segment(self, segment: ContextSegment, parents: Optional[List[ContextSegmentId]] = None) -> ContextSegmentId:
        parents = parents or []
        node = ProvenanceNode(id=segment.metadata.id, segment=segment, parents=list(parents))
        self._nodes[node.id] = node
        for parent_id in parents:
            self._edges.append(ProvenanceEdge(from_id=parent_id, to_id=node.id, relation="derived"))
            if parent_id in self._nodes:
                self._nodes[parent_id].children.append(node.id)
        return node.id

    def link(self, parent_id: ContextSegmentId, child_id: ContextSegmentId, relation: str = "derived") -> None:
        if parent_id not in self._nodes or child_id not in self._nodes:
            raise KeyError(f"Unknown node(s) {parent_id} -> {child_id}")
        self._edges.append(ProvenanceEdge(from_id=parent_id, to_id=child_id, relation=relation))
        if child_id not in self._nodes[parent_id].children:
            self._nodes[parent_id].children.append(child_id)
        if parent_id not in self._nodes[child_id].parents:
            self._nodes[child_id].parents.append(parent_id)

    def lineage(self, node_id: ContextSegmentId) -> List[ContextSegmentId]:
        visited: set[ContextSegmentId] = set()
        order: List[ContextSegmentId] = []

        def traverse(current: ContextSegmentId) -> None:
            if current in visited:
                return
            visited.add(current)
            order.append(current)
            node = self._nodes.get(current)
            if node:
                for parent in node.parents:
                    traverse(parent)

        traverse(node_id)
        return order

    def descendants(self, node_id: ContextSegmentId) -> List[ContextSegmentId]:
        visited: set[ContextSegmentId] = set()
        order: List[ContextSegmentId] = []

        def traverse(current: ContextSegmentId) -> None:
            if current in visited:
                return
            visited.add(current)
            order.append(current)
            node = self._nodes.get(current)
            if node:
                for child in node.children:
                    traverse(child)

        traverse(node_id)
        return order

    def has_cycle(self) -> bool:
        visiting: set[ContextSegmentId] = set()
        visited: set[ContextSegmentId] = set()

        def visit(node_id: ContextSegmentId) -> bool:
            if node_id in visiting:
                return True
            if node_id in visited:
                return False
            visiting.add(node_id)
            node = self._nodes.get(node_id)
            has_cycle = any(visit(child) for child in node.children) if node else False
            visiting.remove(node_id)
            visited.add(node_id)
            return has_cycle

        return any(visit(node_id) for node_id in self._nodes)

    def nodes(self) -> List[ProvenanceNode]:
        return list(self._nodes.values())

    def edges(self) -> List[ProvenanceEdge]:
        return list(self._edges)

    def to_dict(self) -> Dict[str, object]:
        return {"id": self.graph_id, "nodes": self.nodes(), "edges": self.edges()}
