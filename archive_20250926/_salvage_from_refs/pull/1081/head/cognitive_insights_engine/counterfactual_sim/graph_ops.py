"""Graph operations used by the counterfactual simulator."""


def snapshot_neo4j() -> dict[str, str]:
    return {"snapshot": "neo4j"}


def remove_edge(snapshot: dict[str, str], node_id: str, edge_type: str) -> dict[str, str]:
    return {"snapshot": snapshot, "removed": (node_id, edge_type)}


def run_inference(graph: dict[str, str]) -> dict[str, str]:
    return {"result": graph}
