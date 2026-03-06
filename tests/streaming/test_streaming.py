import pytest
from intelgraph.streaming.narrative_nodes import NarrativeNode
from intelgraph.streaming.narrative_edges import NarrativeEdge

def test_narrative_node_initialization():
    """Test that NarrativeNode initializes correctly with given attributes."""
    node = NarrativeNode(narrative_id="NARR-001", strength=0.5, attributes={"theme": "disinfo"})
    assert node.id == "NARR-001"
    assert node.strength == 0.5
    assert node.attributes["theme"] == "disinfo"

def test_narrative_node_update():
    """Test that NarrativeNode strength can be updated."""
    node = NarrativeNode("NARR-002", strength=0.2)
    new_strength = node.update_strength(0.3)
    assert new_strength == 0.5
    assert node.strength == 0.5

def test_narrative_edge_initialization():
    """Test that NarrativeEdge initializes correctly."""
    edge = NarrativeEdge("NARR-001", "NARR-002", NarrativeEdge.AMPLIFIES)
    assert edge.source_id == "NARR-001"
    assert edge.target_id == "NARR-002"
    assert edge.relation_type == "AMPLIFIES"
    assert edge.weight == 1.0

def test_serialization():
    """Test to_dict serialization for nodes and edges."""
    node = NarrativeNode("NARR-003", strength=0.8)
    edge = NarrativeEdge("NARR-003", "NARR-004", NarrativeEdge.CORROBORATES)

    node_dict = node.to_dict()
    assert node_dict["id"] == "NARR-003"
    assert node_dict["type"] == "NarrativeNode"

    edge_dict = edge.to_dict()
    assert edge_dict["source"] == "NARR-003"
    assert edge_dict["relation"] == "CORROBORATES"
    assert edge_dict["type"] == "NarrativeEdge"
