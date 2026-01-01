from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional

from .types import AssembledContext, ContextSegment


@dataclass
class ProvenanceNode:
  id: str
  segment_id: str
  parents: List[str] = field(default_factory=list)
  created_at: datetime | None = None
  source: str | None = None


@dataclass
class ProvenanceEdge:
  from_node: str
  to_node: str
  rationale: str | None = None


class ContextProvenanceGraph:
  def __init__(self) -> None:
    self.nodes: Dict[str, ProvenanceNode] = {}
    self.edges: List[ProvenanceEdge] = []

  def add_segment(self, segment: ContextSegment, parents: Optional[List[str]] = None) -> ProvenanceNode:
    parent_ids = parents or []
    node = ProvenanceNode(
      id=segment.metadata.id,
      segment_id=segment.metadata.id,
      parents=parent_ids,
      created_at=segment.metadata.created_at,
      source=segment.metadata.source,
    )
    self.nodes[node.id] = node
    for parent in parent_ids:
      self.edges.append(ProvenanceEdge(from_node=parent, to_node=node.id, rationale="derived"))
    return node

  def get_lineage(self, segment_id: str) -> List[ProvenanceNode]:
    visited: set[str] = set()
    lineage: List[ProvenanceNode] = []

    def traverse(node_id: str) -> None:
      if node_id in visited:
        return
      node = self.nodes.get(node_id)
      if not node:
        return
      visited.add(node_id)
      lineage.append(node)
      for parent in node.parents:
        traverse(parent)

    traverse(segment_id)
    return lineage

  def attach_to_context(self, context: AssembledContext) -> List[ProvenanceEdge]:
    for segment in context.segments:
      if segment.metadata.id not in self.nodes:
        self.add_segment(segment)
    return list(self.edges)
