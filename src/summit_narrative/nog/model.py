from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, Literal, Sequence


NodeType = Literal["narrative_state", "actor", "channel", "event", "artifact"]
EdgeType = Literal[
    "temporal_precedes",
    "causal_influences",
    "mentions",
    "propagates_via",
    "attributed_to",
]
Lifecycle = Literal["seeding", "propagation", "peak", "mutation", "decline"]
Classification = Literal["public", "internal", "restricted"]


@dataclass(frozen=True)
class Node:
    id: str
    type: NodeType
    attrs: Dict[str, Any]
    lifecycle: Lifecycle
    classification: Classification


@dataclass(frozen=True)
class Edge:
    src: str
    dst: str
    type: EdgeType
    attrs: Dict[str, Any]


@dataclass(frozen=True)
class NarrativeOperatingGraph:
    nodes: Sequence[Node]
    edges: Sequence[Edge]
    version: str


def normalize_nodes(nodes: Iterable[Node]) -> list[Dict[str, Any]]:
    return sorted(
        [
            {
                "id": node.id,
                "type": node.type,
                "attrs": node.attrs,
                "lifecycle": node.lifecycle,
                "classification": node.classification,
            }
            for node in nodes
        ],
        key=lambda item: item["id"],
    )


def normalize_edges(edges: Iterable[Edge]) -> list[Dict[str, Any]]:
    return sorted(
        [
            {"src": edge.src, "dst": edge.dst, "type": edge.type, "attrs": edge.attrs}
            for edge in edges
        ],
        key=lambda item: (item["src"], item["dst"], item["type"]),
    )
