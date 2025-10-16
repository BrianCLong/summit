"""Load registry, catalog, and DAG definitions into a lineage graph."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Iterable

from .graph import LineageGraph
from .models import LineageNode


def _read_json(source: Path | str) -> Dict[str, Any]:
    path = Path(source)
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_lineage(
    *,
    model_registry: Path,
    feature_catalog: Path,
    pipeline_dag: Path,
) -> LineageGraph:
    """Load the supplied artefacts into a :class:`LineageGraph`."""

    graph = LineageGraph()

    model_data = _read_json(model_registry)
    feature_data = _read_json(feature_catalog)
    pipeline_data = _read_json(pipeline_dag)

    _load_datasets(graph, feature_data.get("datasets", []))
    _load_features(graph, feature_data.get("features", []))
    _load_pipelines(graph, pipeline_data.get("pipelines", []))
    _load_models(graph, model_data.get("models", []))

    return graph


def _register_node(graph: LineageGraph, payload: Dict[str, Any], expected_type: str) -> LineageNode:
    node_id = payload.get("id")
    if not node_id:
        raise ValueError(f"Missing 'id' for {expected_type} entry: {payload}")
    node = LineageNode(
        id=node_id,
        type=payload.get("type", expected_type),
        name=payload.get("name", node_id.split(":", 1)[-1]),
        owners=payload.get("owners", []),
        metadata={key: value for key, value in payload.items() if key not in {"id", "type", "name", "owners"}},
    )
    graph.add_node(node)
    return node


def _load_dependencies(graph: LineageGraph, node: LineageNode, keys: Iterable[str]) -> None:
    for key in keys:
        for dependency in node.metadata.get(key, []):
            if isinstance(dependency, str):
                graph.add_dependency(dependency, node.id)
            else:
                raise TypeError(
                    f"Dependency references for {node.id} must be strings, got {dependency!r}."
                )


def _load_datasets(graph: LineageGraph, entries: Iterable[Dict[str, Any]]) -> None:
    for entry in entries:
        node = _register_node(graph, entry, expected_type="dataset")
        _load_dependencies(graph, node, keys=["depends_on"])


def _load_features(graph: LineageGraph, entries: Iterable[Dict[str, Any]]) -> None:
    for entry in entries:
        node = _register_node(graph, entry, expected_type="feature")
        _load_dependencies(graph, node, keys=["depends_on"])


def _load_pipelines(graph: LineageGraph, entries: Iterable[Dict[str, Any]]) -> None:
    for entry in entries:
        node = _register_node(graph, entry, expected_type="pipeline")
        _load_dependencies(graph, node, keys=["depends_on"])
        for produced in entry.get("produces", []):
            graph.add_dependency(node.id, produced)


def _load_models(graph: LineageGraph, entries: Iterable[Dict[str, Any]]) -> None:
    for entry in entries:
        node = _register_node(graph, entry, expected_type="model")
        dependency_keys = ["depends_on", "features", "upstream_models"]
        for key in dependency_keys:
            if key in node.metadata:
                _load_dependencies(graph, node, keys=[key])

