import pytest
from summit.observability.lineage import LineageGraph

def test_lineage_graph():
    graph = LineageGraph()
    graph.add_node("info1", "memory", "hash1", 0.9)
    graph.add_node("info2", "agent", "hash2", 0.4)
    graph.add_edge("info1", "info2", "derived_from")

    assert len(graph.nodes) == 2
    assert len(graph.edges) == 1

    weak_links = graph.detect_weak_links(threshold=0.5)
    assert "info2" in weak_links
    assert "info1" not in weak_links
