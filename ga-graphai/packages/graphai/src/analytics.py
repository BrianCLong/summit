from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any, Iterable, Mapping

import networkx as nx


def _extract_field(record: Mapping[str, Any], field: str, default: Any = None) -> Any:
    if field in record:
        return record[field]
    return default


def build_graph(nodes: Iterable[Mapping[str, Any]] | None, edges: Iterable[Mapping[str, Any]]) -> nx.Graph:
    graph = nx.Graph()
    if nodes:
        for node in nodes:
            identifier = _extract_field(node, "id")
            if identifier is not None:
                graph.add_node(identifier, **{k: v for k, v in node.items() if k != "id"})

    for edge in edges:
        source = _extract_field(edge, "source")
        target = _extract_field(edge, "target")
        if source is None or target is None:
            continue
        attributes = {
            key: value
            for key, value in edge.items()
            if key not in {"source", "target"} and value is not None
        }
        graph.add_edge(source, target, **attributes)
    return graph


def detect_patterns(graph: nx.Graph) -> dict[str, list[list[str]] | list[str]]:
    triangles = []
    for clique in nx.enumerate_all_cliques(graph):
        if len(clique) == 3:
            triangles.append(sorted(clique))

    cycles = []
    for cycle in nx.cycle_basis(graph):
        if len(cycle) >= 4:
            cycles.append(sorted(cycle))

    hubs = [node for node, _ in sorted(graph.degree(), key=lambda item: item[1], reverse=True)[:5]]
    return {"triangles": triangles, "cycles": cycles, "hubs": hubs}


def compute_centrality(graph: nx.Graph) -> dict[str, Mapping[str, float] | list[str]]:
    degree = nx.degree_centrality(graph)
    betweenness = nx.betweenness_centrality(graph, normalized=True)
    closeness = nx.closeness_centrality(graph)
    try:
        eigenvector = nx.eigenvector_centrality(graph, max_iter=2000)
    except nx.NetworkXException:
        eigenvector = {}

    top_hubs = [node for node, _ in sorted(degree.items(), key=lambda item: item[1], reverse=True)[:5]]
    return {
        "degree": degree,
        "betweenness": betweenness,
        "closeness": closeness,
        "eigenvector": eigenvector,
        "top_hubs": top_hubs,
    }


def detect_communities(graph: nx.Graph) -> dict[str, Any]:
    if graph.number_of_edges() == 0:
        communities = [{node} for node in graph.nodes]
        modularity = None
    else:
        communities = list(nx.community.greedy_modularity_communities(graph))
        modularity = nx.community.modularity(graph, communities) if communities else None

    return {
        "communities": [sorted(list(comm)) for comm in communities],
        "modularity": modularity,
    }


def _parse_timestamp(raw: Any) -> datetime | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return datetime.fromtimestamp(float(raw), tz=timezone.utc)
    if isinstance(raw, str):
        candidate = raw
        if candidate.endswith("Z"):
            candidate = candidate.replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(candidate)
        except ValueError:
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    return None


def analyze_temporal(edges: Iterable[Mapping[str, Any]]) -> Mapping[str, Any]:
    instants: list[datetime] = []
    node_last_seen: dict[str, datetime] = {}

    for edge in edges:
        timestamp = _parse_timestamp(_extract_field(edge, "timestamp"))
        if timestamp is None:
            continue
        instants.append(timestamp)
        source = _extract_field(edge, "source")
        target = _extract_field(edge, "target")
        if source is not None:
            node_last_seen[source] = max(node_last_seen.get(source, timestamp), timestamp)
        if target is not None:
            node_last_seen[target] = max(node_last_seen.get(target, timestamp), timestamp)

    if not instants:
        return {
            "start": None,
            "end": None,
            "activity_by_day": {},
            "recency_by_node": {},
        }

    instants.sort()
    activity = Counter(ts.date().isoformat() for ts in instants)
    recency = {
        node: stamp.isoformat()
        for node, stamp in sorted(node_last_seen.items(), key=lambda item: item[1], reverse=True)
    }

    return {
        "start": instants[0].isoformat(),
        "end": instants[-1].isoformat(),
        "activity_by_day": dict(activity),
        "recency_by_node": recency,
    }


def run_custom_algorithms(
    graph: nx.Graph, algorithms: Iterable[Mapping[str, Any]]
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for spec in algorithms:
        name = _extract_field(spec, "name", "custom")
        algorithm = _extract_field(spec, "algorithm", "unknown")
        parameters = _extract_field(spec, "parameters", {}) or {}

        if algorithm == "shortest_path":
            source = parameters.get("source")
            target = parameters.get("target")
            if source in graph and target in graph and nx.has_path(graph, source, target):
                path = nx.shortest_path(graph, source=source, target=target, weight=parameters.get("weight"))
                length = nx.shortest_path_length(graph, source=source, target=target, weight=parameters.get("weight"))
                result = {"path": path, "length": float(length)}
            else:
                result = {"error": "Path not found for requested nodes"}
        elif algorithm == "pagerank":
            alpha = float(parameters.get("alpha", 0.85))
            tol = float(parameters.get("tol", 1e-06))
            result = nx.pagerank(graph, alpha=alpha, tol=tol)
        elif algorithm == "k_core":
            k = int(parameters.get("k", 2))
            core_nodes = list(nx.k_core(graph, k=k).nodes()) if graph.number_of_nodes() else []
            result = {"k": k, "nodes": core_nodes}
        else:
            result = {"error": f"Algorithm '{algorithm}' is not supported"}

        results.append({"name": name, "algorithm": algorithm, "result": result})
    return results


def build_visualization(
    graph: nx.Graph,
    edges: Iterable[Mapping[str, Any]],
    centrality: Mapping[str, Mapping[str, float] | list[str]],
    communities: Mapping[str, Any],
) -> dict[str, Any]:
    positions = nx.spring_layout(graph, seed=7)
    community_map: dict[str, int] = {}
    for index, community in enumerate(communities.get("communities", [])):
        for node in community:
            community_map[str(node)] = index

    nodes = []
    for node_id, (x, y) in positions.items():
        nodes.append(
            {
                "id": node_id,
                "x": float(x),
                "y": float(y),
                "degree": int(graph.degree(node_id)),
                "betweenness": float(centrality["betweenness"].get(node_id, 0.0)),
                "community": community_map.get(node_id),
            }
        )

    edge_payloads: list[dict[str, Any]] = []
    for edge in edges:
        edge_payloads.append(
            {
                "source": _extract_field(edge, "source"),
                "target": _extract_field(edge, "target"),
                "weight": _extract_field(edge, "weight"),
                "timestamp": _extract_field(edge, "timestamp"),
                "label": _extract_field(edge, "label"),
            }
        )

    return {"nodes": nodes, "edges": edge_payloads}


def analyze_graph(
    nodes: Iterable[Mapping[str, Any]] | None,
    edges: Iterable[Mapping[str, Any]],
    custom_algorithms: Iterable[Mapping[str, Any]] | None = None,
) -> dict[str, Any]:
    graph = build_graph(nodes, edges)
    patterns = detect_patterns(graph)
    centrality = compute_centrality(graph)
    communities = detect_communities(graph)
    temporal = analyze_temporal(edges)
    algorithms = custom_algorithms or []
    custom_results = run_custom_algorithms(graph, algorithms)
    visualization = build_visualization(graph, edges, centrality, communities)

    return {
        "patterns": patterns,
        "centrality": centrality,
        "communities": communities,
        "temporal": temporal,
        "custom_algorithms": custom_results,
        "visualization": visualization,
    }
