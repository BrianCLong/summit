"""Core blast-radius calculations for FLIA."""

from __future__ import annotations

from collections import deque
from typing import Dict, Iterable, List, Sequence, Set

from .graph import LineageGraph
from .models import FliaReport
from .playbook import generate_playbook


def summarize_impacts(graph: LineageGraph, impacted_ids: Iterable[str]) -> Dict[str, List[Dict[str, object]]]:
    """Return human-friendly summaries for the impacted nodes."""

    summaries = []
    for node_id in impacted_ids:
        node = graph.nodes[node_id]
        summaries.append(
            {
                "id": node.id,
                "type": node.type,
                "name": node.name,
                "owners": node.owners,
            }
        )
    summaries.sort(key=lambda item: (item["type"], item["name"]))
    models = [item for item in summaries if item["type"] == "model"]
    return {"all": summaries, "models": models}


def analyze_change(graph: LineageGraph, change_id: str) -> FliaReport:
    """Compute the blast radius for the provided change identifier."""

    if change_id not in graph.nodes:
        raise KeyError(f"Unknown change target: {change_id}")

    impacted_ids = graph.downstream_of(change_id)
    summaries = summarize_impacts(graph, impacted_ids)
    metrics_at_risk = sorted(
        {
            metric
            for model in summaries["models"]
            for metric in graph.nodes[model["id"]].metadata.get("metrics", [])
        }
    )

    retrain_order = _determine_retrain_order(graph, [model["id"] for model in summaries["models"]])
    playbook = generate_playbook(graph, impacted_ids=[change_id, *impacted_ids])

    return FliaReport(
        change_id=change_id,
        impacted_nodes=summaries["all"],
        impacted_models=summaries["models"],
        metrics_at_risk=metrics_at_risk,
        retrain_order=retrain_order,
        playbook=playbook,
    )


def _determine_retrain_order(graph: LineageGraph, model_ids: Sequence[str]) -> List[str]:
    if not model_ids:
        return []

    in_degree = {model_id: 0 for model_id in model_ids}
    adjacency: Dict[str, Set[str]] = {model_id: set() for model_id in model_ids}
    model_set = set(model_ids)
    for model_id in model_ids:
        upstream_models = {
            upstream
            for upstream in graph.upstream_of(model_id)
            if upstream in model_set and graph.nodes[upstream].type == "model"
        }
        in_degree[model_id] = len(upstream_models)
        for upstream in upstream_models:
            adjacency[upstream].add(model_id)

    queue: deque[str] = deque(sorted({model for model, degree in in_degree.items() if degree == 0}))
    order: List[str] = []
    while queue:
        current = queue.popleft()
        order.append(current)
        for neighbour in sorted(adjacency.get(current, set())):
            in_degree[neighbour] -= 1
            if in_degree[neighbour] == 0:
                queue.append(neighbour)

    if len(order) != len(model_ids):
        raise RuntimeError("Cycle detected in model dependencies; cannot determine retrain order")

    return order
