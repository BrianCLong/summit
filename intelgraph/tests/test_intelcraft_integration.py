"""Tests for IntelCraft-to-IntelGraph integration helpers."""

from __future__ import annotations

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))

from intelgraph import (  # noqa: E402  pylint: disable=wrong-import-position
    Graph,
    IntelCraftElement,
    IntelCraftRelationship,
    build_intelcraft_graph,
    integrate_intelcraft_elements,
    normalize_intelcraft_elements,
)


def _create_sample_elements() -> list[IntelCraftElement]:
    actor = IntelCraftElement(
        element_id="actor:alpha",
        name="Alpha Actor",
        category="actor",
        description="Threat actor tracked by IntelCraft",
        confidence=0.9,
        metadata={"origin": "intelcraft", "sensitivity": "TLP:AMBER"},
    )
    campaign = IntelCraftElement(
        element_id="campaign:gamma",
        name="Gamma Campaign",
        category="campaign",
    )
    infrastructure = IntelCraftElement(
        element_id="infra:node-7",
        name="Node 7",
        category="infrastructure",
        metadata={"ip": "203.0.113.7"},
    )

    actor.link_to("campaign:gamma", "leads")
    campaign.link_to(
        "infra:node-7",
        "utilizes",
        weight=0.7,
        metadata={"first_seen": "2024-05-02"},
    )
    return [actor, campaign, infrastructure]


def test_integrate_intelcraft_elements_populates_graph() -> None:
    graph = Graph()
    elements = _create_sample_elements()

    integrate_intelcraft_elements(graph, elements)

    assert set(graph.adj.keys()) == {element.element_id for element in elements}
    actor_attributes = graph.get_node_attributes("actor:alpha")
    assert actor_attributes["category"] == "actor"
    assert actor_attributes["sensitivity"] == "TLP:AMBER"

    edge_attrs = graph.get_edge_attributes("campaign:gamma", "infra:node-7")
    assert edge_attrs["relation_type"] == "utilizes"
    assert edge_attrs["weight"] == 0.7
    assert edge_attrs["first_seen"] == "2024-05-02"


def test_build_intelcraft_graph_creates_linked_structure() -> None:
    elements = _create_sample_elements()

    graph = build_intelcraft_graph(elements)

    assert graph.neighbors("actor:alpha") == ["campaign:gamma"]
    path = graph.get_node_attributes("campaign:gamma").get("linked_from")
    assert path == ["actor:alpha"]


def test_intelcraft_element_round_trip() -> None:
    element = IntelCraftElement(
        element_id="infra:node-9",
        name="Node 9",
        category="infrastructure",
        confidence=0.7,
        metadata={"purpose": "command"},
        relationships=[
            IntelCraftRelationship(
                target_id="actor:omega",
                relation_type="controlled-by",
                metadata={"since": "2024-03-01"},
            )
        ],
    )

    serialized = element.to_dict()
    restored = IntelCraftElement.from_dict(serialized)

    assert restored.element_id == element.element_id
    assert restored.metadata == element.metadata
    assert restored.relationships[0].metadata == {"since": "2024-03-01"}


def test_integrate_merges_existing_node_and_edge_attributes() -> None:
    graph = Graph()
    graph.add_node("actor:alpha", attributes={"category": "actor", "aliases": ["A"]})
    graph.add_edge(
        "actor:alpha", "campaign:gamma", attributes={"relation_type": "leads", "confidence": 0.4}
    )

    integrate_intelcraft_elements(
        graph,
        [
            {
                "element_id": "actor:alpha",
                "name": "Alpha Actor",
                "category": "actor",
                "metadata": {"aliases": ["Alpha"], "source": "intelcraft"},
                "relationships": [
                    {
                        "target_id": "campaign:gamma",
                        "relation_type": "leads",
                        "weight": 0.8,
                    }
                ],
            },
            {
                "element_id": "campaign:gamma",
                "name": "Gamma Campaign",
                "category": "campaign",
            },
        ],
    )

    attributes = graph.get_node_attributes("actor:alpha")
    assert attributes["aliases"] == ["A", "Alpha"]
    assert attributes["source"] == "intelcraft"

    edge_attrs = graph.get_edge_attributes("actor:alpha", "campaign:gamma")
    assert edge_attrs["weight"] == 0.8
    assert edge_attrs["confidence"] == 0.4


def test_normalize_intelcraft_elements_accepts_dicts() -> None:
    normalized = normalize_intelcraft_elements(
        [
            {
                "element_id": "actor:alpha",
                "name": "Alpha Actor",
                "category": "actor",
            }
        ]
    )

    assert normalized[0].element_id == "actor:alpha"
