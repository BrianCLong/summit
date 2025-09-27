import pytest

from intelgraph_ai_ml.ttp_miner import TTPMiner

try:
    import networkx as nx
except Exception:  # pragma: no cover - optional dependency
    nx = None


def test_extract_actions_text():
    miner = TTPMiner()
    actions = miner.extract_actions("Reconnaissance. Lateral movement.")
    assert actions == ["Reconnaissance", "Lateral movement"]


@pytest.mark.skipif(nx is None, reason="networkx not installed")
def test_extract_from_graph():
    g = nx.DiGraph()
    g.add_node("actor")
    g.add_node("a1", type="Action", name="reconnaissance")
    g.add_node("a2", type="Action", name="exfiltration")
    g.add_edge("actor", "a1")
    g.add_edge("a1", "a2")
    miner = TTPMiner()
    seq = miner.extract_from_graph(g, "actor")
    assert seq == ["reconnaissance", "exfiltration"]


def test_cluster_length():
    miner = TTPMiner()
    vectors = [[0.0], [1.0], [10.0]]
    labels = miner.cluster(vectors, eps=1.5, min_samples=1)
    assert len(labels) == len(vectors)
