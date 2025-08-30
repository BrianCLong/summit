"""Graph operations used by the counterfactual simulator."""
from typing import Any, Dict


def snapshot_neo4j() -> Dict[str, str]:
    return {"snapshot": "neo4j"}


def remove_edge(snapshot: Dict[str, str], node_id: str, edge_type: str) -> Dict[str, str]:
    return {"snapshot": snapshot, "removed": (node_id, edge_type)}


def run_inference(graph: Dict[str, str]) -> Dict[str, str]:
    return {"result": graph}
