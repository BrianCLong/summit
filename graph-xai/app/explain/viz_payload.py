from __future__ import annotations

import networkx as nx

from ..schemas import VizPayload


def build_viz(g: nx.Graph, node_imp: dict[str, float], edge_imp: dict[str, float]) -> VizPayload:
    nodes = [{"id": n, "importance": node_imp.get(n, 0.0)} for n in g.nodes]
    edges = [{"src": u, "dst": v, "importance": edge_imp.get(f"{u}-{v}", 0.0)} for u, v in g.edges]
    return VizPayload(nodes=nodes, edges=edges, legend={"importance": "0..1"})
