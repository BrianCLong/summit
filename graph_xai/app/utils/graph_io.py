from __future__ import annotations

import networkx as nx

from ..schemas import Subgraph


def to_networkx(sub: Subgraph) -> nx.Graph:
    directed = sub.directed if sub.directed is not None else True
    g = nx.DiGraph() if directed else nx.Graph()
    for node in sub.nodes:
        g.add_node(node.id, **(node.features or {}), attrs=node.attrs or {})
    for edge in sub.edges:
        if edge.undirected or (not directed and sub.directed is None):
            g.add_edge(edge.src, edge.dst, **(edge.features or {}), attrs=edge.attrs or {})
            g.add_edge(edge.dst, edge.src, **(edge.features or {}), attrs=edge.attrs or {})
        else:
            g.add_edge(edge.src, edge.dst, **(edge.features or {}), attrs=edge.attrs or {})
    return g
