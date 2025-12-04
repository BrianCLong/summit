from __future__ import annotations

import uuid
from collections import defaultdict
from typing import Dict, Iterable, List, Tuple

import networkx as nx
import numpy as np

from .models import Effect, ExplainResponse, Graph, InterveneRequest, InterveneResponse, Intervention


class SimulationStore:
    def __init__(self) -> None:
        self._store: Dict[str, ExplainResponse] = {}

    def save(self, simulation: ExplainResponse) -> str:
        self._store[simulation.simulation_id] = simulation
        return simulation.simulation_id

    def get(self, simulation_id: str) -> ExplainResponse | None:
        return self._store.get(simulation_id)


store = SimulationStore()


def _reverse_edges(graph: Graph) -> Dict[str, List[Tuple[str, float]]]:
    parents: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
    for edge in graph.edges:
        parents[edge.target].append((edge.source, edge.weight))
    return parents


def _top_paths(nx_graph: nx.DiGraph, sources: Iterable[str], target: str, k: int) -> List[List[str]]:
    ranked: List[Tuple[float, List[str]]] = []
    for src in sources:
        if src == target:
            continue
        for path in nx.all_simple_paths(nx_graph, source=src, target=target, cutoff=k + 2):
            weight = 1.0
            for i in range(len(path) - 1):
                weight *= abs(nx_graph[path[i]][path[i + 1]].get("weight", 1.0))
            ranked.append((weight, path))
    ranked.sort(key=lambda p: p[0], reverse=True)
    return [p for _, p in ranked[:k]]


def _propagate(graph: Graph, interventions: List[Intervention], baseline: Dict[str, float]) -> Dict[str, float]:
    parents = _reverse_edges(graph)
    values: Dict[str, float] = dict(baseline)
    order = list(nx.topological_sort(_to_networkx(graph))) if nx.is_directed_acyclic_graph(_to_networkx(graph)) else graph.nodes
    intervention_map = {i.node: i.value for i in interventions}
    for node in order:
        if node in intervention_map:
            values[node] = intervention_map[node]
            continue
        parent_values = parents.get(node, [])
        if not parent_values:
            values[node] = values.get(node, 0.0)
            continue
        total = 0.0
        for parent, weight in parent_values:
            total += values.get(parent, baseline.get(parent, 0.0)) * weight
        values[node] = total
    return values


def _to_networkx(graph: Graph) -> nx.DiGraph:
    g = nx.DiGraph()
    g.add_nodes_from(graph.nodes)
    for edge in graph.edges:
        g.add_edge(edge.source, edge.target, weight=edge.weight)
    return g


def do_calculus(request: InterveneRequest) -> InterveneResponse:
    base = request.baseline or {node: 0.0 for node in request.graph.nodes}
    propagated = _propagate(request.graph, request.interventions, base)
    nx_graph = _to_networkx(request.graph)
    intervention_sources = [i.node for i in request.interventions]

    effects: List[Effect] = []
    weights = [abs(edge.weight) for edge in request.graph.edges]
    mean_confidence = float(np.mean(weights) if weights else 0.0)
    for node in request.graph.nodes:
        delta = propagated[node] - base.get(node, 0.0)
        contributing = _top_paths(nx_graph, intervention_sources, node, request.k_paths)
        effects.append(
            Effect(
                node=node,
                delta=float(delta),
                confidence=mean_confidence,
                contributing_paths=contributing,
            )
        )

    simulation_id = str(uuid.uuid4())
    explanation = ExplainResponse(
        simulation_id=simulation_id,
        graph=request.graph,
        effects=effects,
        confidence=mean_confidence,
    )
    store.save(explanation)
    return InterveneResponse(simulation_id=simulation_id, effects=effects, graph=request.graph)
