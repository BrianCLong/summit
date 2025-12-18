from ai.motif_miner import MotifMiner, MiningConfig, is_enabled
from ai.motif_miner.miner import SimpleGraph


def test_mine_discovers_triangles_and_paths():
    graph = SimpleGraph()
    graph.add_edges_from([(1, 2), (2, 3), (3, 1), (3, 4)])
    miner = MotifMiner(MiningConfig(seed=123, min_support=1))

    motifs = miner.mine(graph)
    assert (1, 2, 3) in motifs["triangle"]
    assert (1, 3, 4) in motifs["path3"]


def test_mine_respects_support_and_size():
    graph = SimpleGraph()
    graph.add_edges_from([(1, 2), (2, 3), (3, 1), (1, 4), (4, 5)])
    miner = MotifMiner(MiningConfig(seed=7, min_support=2, max_nodes=3))

    motifs = miner.mine(graph)
    assert motifs["triangle"] == []
    assert all(len(nodes) <= 3 for nodes in motifs["path3"])


def test_explain_outputs_strength_strings():
    graph = SimpleGraph()
    graph.add_edges_from([(1, 2), (2, 3), (3, 1)])
    miner = MotifMiner(MiningConfig())
    motifs = miner.mine(graph)
    explanations = miner.explain(graph, motifs)

    assert explanations["triangle"]
    assert "strength=" in explanations["triangle"][0]


def test_feature_flag_helper_reads_env(monkeypatch):
    monkeypatch.setenv("MOTIF_MINER_ENABLED", "true")
    assert is_enabled()
    monkeypatch.setenv("MOTIF_MINER_ENABLED", "false")
    assert not is_enabled()
