"""Dependency DAG helpers for package manifests."""

from __future__ import annotations

from collections import deque


class DependencyCycleError(ValueError):
    """Raised when a dependency cycle is detected."""


def topological_sort(graph: dict[str, set[str]]) -> list[str]:
    """Return a deterministic topological ordering for a dependency graph.

    Graph format: ``{node: {dependency_node, ...}}``.
    """

    in_degree: dict[str, int] = {node: 0 for node in graph}
    reverse_edges: dict[str, set[str]] = {node: set() for node in graph}

    for node, deps in graph.items():
        for dependency in deps:
            if dependency not in in_degree:
                in_degree[dependency] = 0
                reverse_edges[dependency] = set()
            in_degree[node] += 1
            reverse_edges[dependency].add(node)

    queue = deque(sorted(node for node, degree in in_degree.items() if degree == 0))
    ordered: list[str] = []

    while queue:
        current = queue.popleft()
        ordered.append(current)

        for dependent in sorted(reverse_edges[current]):
            in_degree[dependent] -= 1
            if in_degree[dependent] == 0:
                queue.append(dependent)

    if len(ordered) != len(in_degree):
        raise DependencyCycleError("Dependency graph contains at least one cycle")

    return ordered


def build_manifest_graph(package_name: str, dependencies: dict[str, str]) -> dict[str, set[str]]:
    """Create a graph from one package to its direct dependency names."""

    return {
        package_name: set(sorted(dependencies)),
        **{name: set() for name in sorted(dependencies)},
    }
