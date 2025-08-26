from __future__ import annotations

import networkx as nx
from fastapi.testclient import TestClient

from app.main import app


def triangle_graph():
    g = nx.Graph()
    g.add_edge("A", "B")
    g.add_edge("B", "C")
    return g


def client():
    return TestClient(app)
