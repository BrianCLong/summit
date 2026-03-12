import pytest
from summit.graph.model import Node, Edge

def test_node_creation():
    node = Node(id="1", type="actor", platform="x", attrs={"name": "test_actor"})
    assert node.id == "1"
    assert node.type == "actor"
    assert node.platform == "x"
    assert node.attrs["name"] == "test_actor"

def test_edge_creation():
    edge = Edge(src="1", dst="2", type="engages", ts=1234567890)
    assert edge.src == "1"
    assert edge.dst == "2"
    assert edge.type == "engages"
    assert edge.ts == 1234567890
    assert edge.weight == 1.0
    assert edge.attrs is None
