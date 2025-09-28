"""IntelCraft tradecraft elements and graph integration helpers."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional

from ..graph_analytics.core_analytics import Graph


@dataclass
class IntelCraftRelationship:
    """Relationship between two IntelCraft elements."""

    target_id: str
    relation_type: str
    weight: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def as_edge_attributes(self) -> Dict[str, Any]:
        attributes: Dict[str, Any] = {"relation_type": self.relation_type}
        if self.weight is not None:
            attributes["weight"] = self.weight
        if self.metadata:
            attributes.update(self.metadata)
        return attributes


@dataclass
class IntelCraftElement:
    """IntelCraft knowledge element ready for IntelGraph ingestion."""

    element_id: str
    name: str
    category: str
    description: Optional[str] = None
    confidence: float = 0.5
    metadata: Dict[str, Any] = field(default_factory=dict)
    relationships: List[IntelCraftRelationship] = field(default_factory=list)

    def as_node_attributes(self) -> Dict[str, Any]:
        attributes: Dict[str, Any] = {
            "name": self.name,
            "category": self.category,
            "confidence": self.confidence,
        }
        if self.description:
            attributes["description"] = self.description
        if self.metadata:
            attributes.update(self.metadata)
        return attributes

    def link_to(
        self,
        target_id: str,
        relation_type: str,
        *,
        weight: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.relationships.append(
            IntelCraftRelationship(
                target_id=target_id,
                relation_type=relation_type,
                weight=weight,
                metadata=metadata or {},
            )
        )


def integrate_intelcraft_elements(
    graph: Graph,
    elements: Iterable[IntelCraftElement],
    *,
    enrich_targets: bool = True,
) -> None:
    """Merge IntelCraft elements into an existing :class:`Graph` instance."""

    element_index = {element.element_id: element for element in elements}

    for element in element_index.values():
        graph.add_node(element.element_id, attributes=element.as_node_attributes())

    for element in element_index.values():
        for relationship in element.relationships:
            edge_attributes = relationship.as_edge_attributes()
            graph.add_edge(element.element_id, relationship.target_id, attributes=edge_attributes)
            if enrich_targets and relationship.target_id in element_index:
                graph.update_node_attributes(
                    relationship.target_id,
                    {"linked_from": sorted({
                        *graph.get_node_attributes(relationship.target_id).get("linked_from", []),
                        element.element_id,
                    })},
                )


def build_intelcraft_graph(elements: Iterable[IntelCraftElement]) -> Graph:
    """Create a new :class:`Graph` populated with IntelCraft elements."""

    graph = Graph()
    integrate_intelcraft_elements(graph, elements)
    return graph


__all__ = [
    "IntelCraftElement",
    "IntelCraftRelationship",
    "integrate_intelcraft_elements",
    "build_intelcraft_graph",
]
