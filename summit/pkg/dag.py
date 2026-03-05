from __future__ import annotations

from collections import defaultdict, deque


class DependencyCycleError(ValueError):
    """Raised when dependency graph contains cycles."""


def build_dependency_dag(root_name: str, dependencies: dict[str, str]) -> dict[str, list[str]]:
    """Build a simple adjacency map rooted at the package name."""
    dag: dict[str, list[str]] = {root_name: sorted(dependencies.keys())}
    for dep in sorted(dependencies.keys()):
        dag[dep] = []
    return dag


def topological_order(dag: dict[str, list[str]]) -> list[str]:
    indegree: dict[str, int] = defaultdict(int)
    for node in dag:
        indegree.setdefault(node, 0)
        for neighbor in dag[node]:
            indegree[neighbor] += 1

    queue = deque(sorted(node for node, degree in indegree.items() if degree == 0))
    ordered: list[str] = []

    while queue:
        node = queue.popleft()
        ordered.append(node)
        for neighbor in sorted(dag.get(node, [])):
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                queue.append(neighbor)

    if len(ordered) != len(indegree):
        unresolved = sorted(node for node, degree in indegree.items() if degree > 0)
        raise DependencyCycleError(f"dependency cycle detected involving: {', '.join(unresolved)}")
    return ordered
