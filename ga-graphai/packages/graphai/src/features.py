from typing import Dict, Iterable, Tuple

import networkx as nx


def build_degree_features(edges: Iterable[Tuple[str, str]]) -> Dict[str, int]:
    """Compute node degree for an edge list.

    Args:
        edges: iterable of (src, dst) pairs.

    Returns:
        Mapping of node id to degree.
    """
    graph = nx.Graph()
    graph.add_edges_from(edges)
    return {node: int(deg) for node, deg in graph.degree()}
