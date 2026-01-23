from __future__ import annotations

import networkx as nx

from app.explain.fairness import check
from app.explain.robustness import assess
from app.schemas import ModelOutput


def test_robustness_range(monkeypatch):
    g = nx.Graph()
    g.add_edge("A", "B")
    g.add_edge("B", "C")
    output = ModelOutput(task="link", target={"src": "A", "dst": "C"}, score=0.8)
    r = assess(g, output)
    assert 0 <= r.stability <= 1


def test_fairness(monkeypatch):
    monkeypatch.setenv("FAIRNESS_ENABLED", "true")
    from app.config import get_settings

    get_settings.cache_clear()
    g = nx.Graph()
    g.add_node("A", attrs={"sensitive": "g1"})
    g.add_node("B", attrs={"sensitive": "g2"})
    g.add_node("C", attrs={"sensitive": "g2"})
    g.add_edge("A", "B")
    g.add_edge("B", "C")
    output = ModelOutput(task="link", target={"src": "A", "dst": "C"}, score=0.8)
    f = check(g, output)
    assert f.enabled
    assert f.parity
