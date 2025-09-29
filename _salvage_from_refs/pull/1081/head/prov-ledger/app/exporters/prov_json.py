import networkx as nx


def export(graph: nx.DiGraph) -> dict:
    nodes = [{"id": n, **graph.nodes[n]} for n in graph.nodes]
    edges = [{"source": u, "target": v} for u, v in graph.edges]
    return {"nodes": nodes, "edges": edges, "metadata": {}}
