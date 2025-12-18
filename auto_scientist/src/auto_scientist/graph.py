from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Iterable, Optional
from .schemas import Node, Edge, NodeType, EdgeType


@dataclass
class ExperimentGraph:
    nodes: Dict[str, Node] = field(default_factory=dict)
    edges: List[Edge] = field(default_factory=list)

    def add_node(self, node: Node) -> None:
        if node.id in self.nodes:
            raise ValueError(f"Node {node.id} already exists")
        self.nodes[node.id] = node

    def add_edge(self, edge: Edge) -> None:
        if edge.source not in self.nodes or edge.target not in self.nodes:
            raise ValueError("Both source and target must exist in the graph")
        self.edges.append(edge)

    def successors(self, node_id: str, edge_type: Optional[EdgeType] = None) -> Iterable[Node]:
        for e in self.edges:
            if e.source == node_id and (edge_type is None or e.type == edge_type):
                yield self.nodes[e.target]

    def predecessors(self, node_id: str, edge_type: Optional[EdgeType] = None) -> Iterable[Node]:
        for e in self.edges:
            if e.target == node_id and (edge_type is None or e.type == edge_type):
                yield self.nodes[e.source]

    def nodes_by_type(self, type_: NodeType) -> Iterable[Node]:
        return (n for n in self.nodes.values() if n.type == type_)

    def to_dict(self) -> dict:
        return {
            "nodes": [vars(n) for n in self.nodes.values()],
            "edges": [vars(e) for e in self.edges],
        }
