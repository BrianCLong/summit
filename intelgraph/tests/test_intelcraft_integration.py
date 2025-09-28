"""Tests for IntelCraft-to-IntelGraph integration helpers."""

from __future__ import annotations

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))

from intelgraph import (  # noqa: E402  pylint: disable=wrong-import-position
    Graph,
    IntelCraftElement,
    build_intelcraft_graph,
    integrate_intelcraft_elements,
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
