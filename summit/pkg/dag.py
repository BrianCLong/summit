"""Dependency DAG construction and cycle detection."""

from __future__ import annotations

from collections import defaultdict, deque
from typing import Dict, Iterable, List


class DependencyCycleError(ValueError):
    """Raised when dependency graph contains a cycle."""


def build_dependency_dag(root_name: str, dependencies: Dict[str, str]) -> dict:
    """Build a deterministic DAG report for a package and direct dependencies."""
    graph = defaultdict(list)
    indegree = defaultdict(int)

    indegree[root_name] = 0
    for dep in sorted(dependencies):
        graph[root_name].append(dep)
        indegree[dep] += 1

    queue = deque(sorted(node for node, value in indegree.items() if value == 0))
    topo_order: List[str] = []

    while queue:
        node = queue.popleft()
        topo_order.append(node)
        for neighbor in sorted(graph.get(node, [])):
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                queue.append(neighbor)

    if len(topo_order) != len(indegree):
        raise DependencyCycleError("Dependency graph contains a cycle")

    edges = [{"from": root_name, "to": dep} for dep in sorted(dependencies)]
    return {
        "nodes": sorted(indegree.keys()),
        "edges": edges,
        "topologicalOrder": topo_order,
    }


def detect_cycle_from_edges(nodes: Iterable[str], edges: Iterable[tuple[str, str]]) -> None:
    """Utility for tests and future expansion where arbitrary edges are provided."""
    graph = defaultdict(list)
    indegree = {node: 0 for node in nodes}

    for source, target in edges:
        graph[source].append(target)
        indegree[target] = indegree.get(target, 0) + 1
        indegree.setdefault(source, 0)

    queue = deque(sorted(node for node, degree in indegree.items() if degree == 0))
    seen = 0
    while queue:
        node = queue.popleft()
        seen += 1
        for neighbor in sorted(graph.get(node, [])):
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                queue.append(neighbor)

    if seen != len(indegree):
        raise DependencyCycleError("Dependency graph contains a cycle")
