"""Lightweight graph analytics utilities used across IntelGraph."""

from __future__ import annotations

from collections import deque
from typing import Any, Dict, List, MutableMapping, Optional, Set


class Graph:
    """A simple in-memory undirected graph with attribute support."""

    def __init__(self) -> None:
        self.adj: Dict[Any, List[Any]] = {}
        self.node_attrs: Dict[Any, Dict[str, Any]] = {}
        self.edge_attrs: Dict[tuple[Any, Any], Dict[str, Any]] = {}

    def add_node(self, node: Any, attributes: Optional[Dict[str, Any]] = None) -> None:
        if node not in self.adj:
            self.adj[node] = []
        if node not in self.node_attrs:
            self.node_attrs[node] = {}
        if attributes:
            self.node_attrs[node].update(attributes)

    def update_node_attributes(self, node: Any, attributes: Dict[str, Any]) -> None:
        self.add_node(node)
        self.node_attrs[node].update(attributes)

    def merge_node_attributes(self, node: Any, attributes: Dict[str, Any]) -> None:
        """Merge ``attributes`` into ``node`` using a deep merge strategy."""

        self.add_node(node)
        self.node_attrs[node] = _merge_attribute_dicts(self.node_attrs[node], attributes)

    def get_node_attributes(self, node: Any) -> Dict[str, Any]:
        return dict(self.node_attrs.get(node, {}))

    def add_edge(self, u: Any, v: Any, attributes: Optional[Dict[str, Any]] = None) -> None:
        self.add_node(u)
        self.add_node(v)
        if v not in self.adj[u]:
            self.adj[u].append(v)
        if u not in self.adj[v]:
            self.adj[v].append(u)
        if attributes:
            key = self._edge_key(u, v)
            data = self.edge_attrs.setdefault(key, {})
            data.update(attributes)

    def update_edge_attributes(self, u: Any, v: Any, attributes: Dict[str, Any]) -> None:
        self.add_edge(u, v)
        key = self._edge_key(u, v)
        data = self.edge_attrs.setdefault(key, {})
        data.update(attributes)

    def merge_edge_attributes(self, u: Any, v: Any, attributes: Dict[str, Any]) -> None:
        """Merge ``attributes`` into the edge ``(u, v)``."""

        self.add_edge(u, v)
        key = self._edge_key(u, v)
        current = self.edge_attrs.setdefault(key, {})
        self.edge_attrs[key] = _merge_attribute_dicts(current, attributes)

    def get_edge_attributes(self, u: Any, v: Any) -> Dict[str, Any]:
        return dict(self.edge_attrs.get(self._edge_key(u, v), {}))

    def neighbors(self, node: Any) -> List[Any]:
        return list(self.adj.get(node, []))

    def has_node(self, node: Any) -> bool:
        return node in self.adj

    def has_edge(self, u: Any, v: Any) -> bool:
        key = self._edge_key(u, v)
        return key in self.edge_attrs or (u in self.adj and v in self.adj[u])

    def _edge_key(self, u: Any, v: Any) -> tuple[Any, Any]:
        return tuple(sorted((u, v), key=repr))


def _merge_attribute_dicts(
    original: MutableMapping[str, Any],
    incoming: MutableMapping[str, Any],
) -> Dict[str, Any]:
    """Merge ``incoming`` into ``original`` preserving nested structures."""

    result: Dict[str, Any] = dict(original)
    for key, value in incoming.items():
        if key not in result:
            result[key] = value
            continue

        existing = result[key]
        result[key] = _merge_attribute_values(existing, value)
    return result


def _merge_attribute_values(existing: Any, incoming: Any) -> Any:
    if isinstance(existing, MutableMapping) and isinstance(incoming, MutableMapping):
        return _merge_attribute_dicts(existing, incoming)

    if isinstance(existing, list) and isinstance(incoming, list):
        seen: Set[Any] = set()
        merged: List[Any] = []
        for item in existing + incoming:
            marker = _hashable_marker(item)
            if marker in seen:
                continue
            seen.add(marker)
            merged.append(item)
        return merged

    if isinstance(existing, set) and isinstance(incoming, set):
        return existing | incoming

    if isinstance(existing, tuple) and isinstance(incoming, tuple):
        merged_list = _merge_attribute_values(list(existing), list(incoming))
        return tuple(merged_list) if isinstance(merged_list, list) else merged_list

    return incoming


def _hashable_marker(value: Any) -> Any:
    if isinstance(value, MutableMapping):
        return tuple(sorted((k, _hashable_marker(v)) for k, v in value.items()))
    if isinstance(value, list):
        return tuple(_hashable_marker(item) for item in value)
    if isinstance(value, set):
        return tuple(sorted(_hashable_marker(item) for item in value))
    if isinstance(value, tuple):
        return tuple(_hashable_marker(item) for item in value)
    return value


def find_shortest_path(graph: Graph, start_node: Any, end_node: Any) -> List[Any]:
    """Find the shortest path between ``start_node`` and ``end_node``."""

    if start_node not in graph.adj or end_node not in graph.adj:
        return []

    queue = deque([(start_node, [start_node])])
    visited = {start_node}

    while queue:
        current_node, path = queue.popleft()

        if current_node == end_node:
            return path

        for neighbor in graph.adj.get(current_node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [neighbor]))

    return []


def find_k_shortest_paths(
    graph: Graph,
    start_node: Any,
    end_node: Any,
    k: int,
    weight_property: Optional[str] = None,
) -> List[List[Any]]:
    """Stub for finding the ``k`` shortest paths between two nodes."""

    print(f"Finding {k} shortest paths from {start_node} to {end_node}")
    if weight_property:
        print(f"Ignoring weight property '{weight_property}' in stub implementation")
    return []


def detect_communities_louvain(graph: Graph) -> Dict[str, Any]:
    """Stub for detecting communities using the Louvain method."""

    print("Detecting communities using Louvain method")
    return {}


def detect_communities_leiden(graph: Graph) -> Dict[str, Any]:
    """Stub for detecting communities using the Leiden method."""

    print("Detecting communities using Leiden method")
    return {}


def calculate_betweenness_centrality(graph: Graph) -> Dict[str, Any]:
    """Stub for calculating betweenness centrality."""

    print("Calculating betweenness centrality")
    return {}


def calculate_eigenvector_centrality(graph: Graph) -> Dict[str, Any]:
    """Stub for calculating eigenvector centrality."""

    print("Calculating eigenvector centrality")
    return {}


def detect_roles_and_brokers(graph: Graph) -> Dict[str, Any]:
    """Stub for detecting roles and brokers in a graph."""

    print("Detecting roles and brokers")
    return {}


__all__ = [
    "Graph",
    "find_shortest_path",
    "find_k_shortest_paths",
    "detect_communities_louvain",
    "detect_communities_leiden",
    "calculate_betweenness_centrality",
    "calculate_eigenvector_centrality",
    "detect_roles_and_brokers",
]
