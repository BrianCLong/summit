from __future__ import annotations

import networkx as nx

from app.explain.counterfactuals import find_counterfactual
from app.schemas import ModelOutput


def test_counterfactual_limit():
    g = nx.Graph()
    g.add_edge("A", "B")
    g.add_edge("B", "C")
    output = ModelOutput(task="link", target={"src": "A", "dst": "C"}, score=0.9)
    cfs = find_counterfactual(g, output)
    assert cfs
    assert len(cfs[0].edits) <= 3
