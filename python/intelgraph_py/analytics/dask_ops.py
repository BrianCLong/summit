from __future__ import annotations

import dask
import networkx as nx


def degree_centrality_parallel(edges: list[tuple[str, str]]):
    G = nx.Graph()
    G.add_edges_from(edges)
    return nx.degree_centrality(G)


def degree_centrality_dask(edges: list[tuple[str, str]]):
    task = dask.delayed(degree_centrality_parallel)(edges)
    return task.compute()
