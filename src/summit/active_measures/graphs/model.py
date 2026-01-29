from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, Tuple, Set

NodeId = str
EdgeKey = Tuple[NodeId, NodeId, str]  # (src, dst, interaction_type)

@dataclass
class Graph:
    nodes: Set[NodeId] = field(default_factory=set)
    edges: Dict[EdgeKey, float] = field(default_factory=dict)  # weight

def add_edge(g: Graph, src: NodeId, dst: NodeId, kind: str, w: float) -> None:
    g.nodes.add(src)
    g.nodes.add(dst)
    k = (src, dst, kind)
    g.edges[k] = g.edges.get(k, 0.0) + w
