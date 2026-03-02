from summit.active_measures.graphs.baselines import out_weight
from summit.active_measures.graphs.model import Graph, add_edge


def test_graph_construction():
    g = Graph()
    add_edge(g, "a", "b", "mention", 1.0)
    add_edge(g, "b", "c", "retweet", 2.0)

    assert "a" in g.nodes
    assert "b" in g.nodes
    assert "c" in g.nodes
    assert len(g.edges) == 2
    assert g.edges[("a", "b", "mention")] == 1.0

def test_out_weight_baseline():
    g = Graph()
    # a -> b (1.0)
    # a -> c (2.0)
    # b -> a (0.5)
    add_edge(g, "a", "b", "x", 1.0)
    add_edge(g, "a", "c", "y", 2.0)
    add_edge(g, "b", "a", "z", 0.5)

    weights = out_weight(g)
    assert weights["a"] == 3.0
    assert weights["b"] == 0.5
    # c has no out-edges
    assert weights.get("c", 0.0) == 0.0
