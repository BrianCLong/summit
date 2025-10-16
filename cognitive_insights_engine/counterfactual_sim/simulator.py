"""Counterfactual simulation utilities."""

from typing import Any

from graph_ops import remove_edge, run_inference, snapshot_neo4j


def simulate_counterfactual(node_id: str, remove_edge_type: str) -> Any:
    """Return inference results after removing an edge type from a node."""
    snapshot = snapshot_neo4j()
    modified = remove_edge(snapshot, node_id, remove_edge_type)
    return run_inference(modified)
