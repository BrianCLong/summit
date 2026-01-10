from __future__ import annotations

import networkx as nx

from ..schemas import ModelOutput


def edge_importance(g: nx.Graph, output: ModelOutput) -> dict[str, float]:
    src = output.target.get("src")
    dst = output.target.get("dst")
    importances: dict[str, float] = {}
    if src and dst and nx.has_path(g, src, dst):
        path = nx.shortest_path(g, src, dst)
        for i in range(len(path) - 1):
            e = f"{path[i]}-{path[i + 1]}"
            importances[e] = 1.0 / len(path)
    return importances


def node_importance(g: nx.Graph, output: ModelOutput) -> dict[str, float]:
    src = output.target.get("src")
    dst = output.target.get("dst")
    scores: dict[str, float] = {}
    if src and dst and nx.has_path(g, src, dst):
        path = nx.shortest_path(g, src, dst)
        for n in path:
            scores[n] = 1.0 / len(path)
    return scores
