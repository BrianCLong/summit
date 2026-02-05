from dataclasses import dataclass, field
from typing import Dict, List
import time

@dataclass
class LineageNode:
    node_id: str
    source_type: str  # memory, agent, external_api
    content_hash: str
    confidence: float
    timestamp: float = field(default_factory=time.time)

@dataclass
class LineageEdge:
    source_id: str
    target_id: str
    relation: str

@dataclass
class LineageGraph:
    nodes: Dict[str, LineageNode] = field(default_factory=dict)
    edges: List[LineageEdge] = field(default_factory=list)

    def add_node(self, node_id: str, source_type: str, content_hash: str, confidence: float):
        if node_id not in self.nodes:
            self.nodes[node_id] = LineageNode(node_id, source_type, content_hash, confidence)

    def add_edge(self, source_id: str, target_id: str, relation: str):
        self.edges.append(LineageEdge(source_id, target_id, relation))

    def detect_weak_links(self, threshold: float = 0.5) -> List[str]:
        """Returns node IDs where confidence is below threshold."""
        return [nid for nid, node in self.nodes.items() if node.confidence < threshold]
