"""IntelCraft tradecraft elements and graph integration helpers."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Optional, Sequence, Union

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

    def to_dict(self) -> Dict[str, Any]:
        data = {
            "target_id": self.target_id,
            "relation_type": self.relation_type,
        }
        if self.weight is not None:
            data["weight"] = self.weight
        if self.metadata:
            data["metadata"] = dict(self.metadata)
        return data

    @classmethod
    def from_dict(cls, payload: Mapping[str, Any]) -> "IntelCraftRelationship":
        if "target_id" not in payload or "relation_type" not in payload:
            missing = {key for key in ("target_id", "relation_type") if key not in payload}
            raise ValueError(f"Relationship payload missing fields: {sorted(missing)}")
        metadata = payload.get("metadata") or {}
        if not isinstance(metadata, MutableMapping):
            raise TypeError("relationship metadata must be a mapping")
        return cls(
            target_id=str(payload["target_id"]),
            relation_type=str(payload["relation_type"]),
            weight=payload.get("weight"),
            metadata=dict(metadata),
        )


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

    def to_dict(self) -> Dict[str, Any]:
        data: Dict[str, Any] = {
            "element_id": self.element_id,
            "name": self.name,
            "category": self.category,
            "confidence": self.confidence,
        }
        if self.description is not None:
            data["description"] = self.description
        if self.metadata:
            data["metadata"] = dict(self.metadata)
        if self.relationships:
            data["relationships"] = [relationship.to_dict() for relationship in self.relationships]
        return data

    @classmethod
    def from_dict(cls, payload: Mapping[str, Any]) -> "IntelCraftElement":
        required = {"element_id", "name", "category"}
        missing = [key for key in required if key not in payload]
        if missing:
            raise ValueError(f"Element payload missing fields: {missing}")

        metadata = payload.get("metadata") or {}
        if metadata and not isinstance(metadata, MutableMapping):
            raise TypeError("element metadata must be a mapping")

        raw_relationships = payload.get("relationships")
        if raw_relationships is None:
            raw_relationships = []
        if raw_relationships and not isinstance(raw_relationships, Sequence):
            raise TypeError("relationships must be provided as a sequence")
        relationship_payloads: Sequence[Any] = raw_relationships  # type: ignore[assignment]
        relationships = [
            relation
            if isinstance(relation, IntelCraftRelationship)
            else IntelCraftRelationship.from_dict(relation)
            for relation in relationship_payloads
        ]

        return cls(
            element_id=str(payload["element_id"]),
            name=str(payload["name"]),
            category=str(payload["category"]),
            description=payload.get("description"),
            confidence=float(payload.get("confidence", 0.5)),
            metadata=dict(metadata),
            relationships=list(relationships),
        )


IntelCraftElementInput = Union[IntelCraftElement, Mapping[str, Any]]


def integrate_intelcraft_elements(
    graph: Graph,
    elements: Iterable[IntelCraftElementInput],
    *,
    enrich_targets: bool = True,
    merge_attributes: bool = True,
) -> None:
    """Merge IntelCraft elements into an existing :class:`Graph` instance."""

    normalized_elements = normalize_intelcraft_elements(elements)
    element_index: Dict[str, IntelCraftElement] = {}

    for element in normalized_elements:
        if element.element_id in element_index:
            raise ValueError(f"Duplicate IntelCraft element id: {element.element_id}")
        element_index[element.element_id] = element

    for element in element_index.values():
        attrs = element.as_node_attributes()
        if merge_attributes and graph.has_node(element.element_id):
            graph.merge_node_attributes(element.element_id, attrs)
        else:
            graph.add_node(element.element_id, attributes=attrs)

    for element in element_index.values():
        for relationship in element.relationships:
            edge_attributes = relationship.as_edge_attributes()
            if merge_attributes and graph.has_edge(element.element_id, relationship.target_id):
                graph.merge_edge_attributes(element.element_id, relationship.target_id, edge_attributes)
            else:
                graph.add_edge(element.element_id, relationship.target_id, attributes=edge_attributes)
            if enrich_targets and relationship.target_id in element_index:
                linked_from = graph.get_node_attributes(relationship.target_id).get("linked_from", [])
                new_linked_from = sorted({*linked_from, element.element_id})
                if merge_attributes:
                    graph.merge_node_attributes(relationship.target_id, {"linked_from": new_linked_from})
                else:
                    graph.update_node_attributes(relationship.target_id, {"linked_from": new_linked_from})


def build_intelcraft_graph(elements: Iterable[IntelCraftElementInput]) -> Graph:
    """Create a new :class:`Graph` populated with IntelCraft elements."""

    graph = Graph()
    integrate_intelcraft_elements(graph, elements)
    return graph


def normalize_intelcraft_elements(
    elements: Iterable[IntelCraftElementInput],
) -> List[IntelCraftElement]:
    """Return ``IntelCraftElement`` instances for ``elements`` inputs."""

    normalized: List[IntelCraftElement] = []
    for element in elements:
        if isinstance(element, IntelCraftElement):
            normalized.append(element)
        else:
            normalized.append(IntelCraftElement.from_dict(element))
    return normalized


__all__ = [
    "IntelCraftElement",
    "IntelCraftRelationship",
    "integrate_intelcraft_elements",
    "build_intelcraft_graph",
    "normalize_intelcraft_elements",
]
