from __future__ import annotations

import networkx as nx

from ..config import get_settings
from ..schemas import Counterfactual, CounterfactualEdit, ModelOutput


def find_counterfactual(g: nx.Graph, output: ModelOutput) -> list[Counterfactual]:
    settings = get_settings()
    src = output.target.get("src")
    dst = output.target.get("dst")
    if not src or not dst or not nx.has_path(g, src, dst):
        return []
    path = nx.shortest_path(g, src, dst)
    best_edge = None
    if len(path) > 1:
        best_edge = (path[-2], path[-1])
    if best_edge:
        op_cost = settings.cf_costs["remove_edge"]
        edit = CounterfactualEdit(
            op="remove_edge", payload={"src": best_edge[0], "dst": best_edge[1]}, cost=op_cost
        )
        cf = Counterfactual(
            target=output.target,
            new_score=max(0.0, output.score - 0.39),
            delta=-0.39,
            edits=[edit],
        )
        return [cf]
    return []
