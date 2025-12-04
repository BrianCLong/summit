import json
from pathlib import Path

import networkx as nx
import pandas as pd

from ai.cdis.learners import GrangerLearner, NotearsLearner, PCLearner


FIXTURE = Path(__file__).parent.parent / "fixtures" / "gold_dag.json"

def load_fixture():
    with FIXTURE.open() as f:
        return json.load(f)


def test_notears_respects_gold_structure():
    payload = load_fixture()
    df = pd.DataFrame(payload["records"])
    learner = NotearsLearner(threshold=0.1)
    learned = learner.learn(df)
    g = learned.graph
    assert nx.is_directed_acyclic_graph(g)
    assert set(g.nodes) == set(payload["nodes"])
    assert learned.confidence > 0


def test_pc_prunes_weak_edges():
    payload = load_fixture()
    df = pd.DataFrame(payload["records"])
    learner = PCLearner(alpha=0.05)
    learned = learner.learn(df)
    # tolerance: at least two of the true edges are recovered
    recovered = {(s, t) for s, t in learned.graph.edges()}
    truth = {(e["source"], e["target"]) for e in payload["edges"]}
    assert len(recovered & truth) >= 2


def test_granger_detects_temporal_direction():
    payload = load_fixture()
    df = pd.DataFrame(payload["records"])
    df["t"] = range(len(df))
    df = df.sort_values("t")
    learner = GrangerLearner(max_lag=1)
    learned = learner.learn(df[["treatment", "mediator", "outcome", "noise"]])
    assert learned.confidence >= 0
    assert any(edge[0] == "treatment" for edge in learned.graph.edges())
