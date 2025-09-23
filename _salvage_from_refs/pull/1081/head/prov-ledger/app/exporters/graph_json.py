import networkx as nx


def export(graph: nx.DiGraph) -> dict:
    return {
        "nodes": list(graph.nodes),
        "edges": [[u, v] for u, v in graph.edges],
        "metadata": {},
    }
