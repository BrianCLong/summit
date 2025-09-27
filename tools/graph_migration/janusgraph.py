"""JanusGraph export translation helpers."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple


def _graphson_value(value: Any) -> Any:
    """Extract primitive values from GraphSON structures."""

    if isinstance(value, dict):
        if "@value" in value:
            return _graphson_value(value["@value"])
        if "value" in value:
            return _graphson_value(value["value"])
        # Drop metadata fields that are not properties
        return {key: _graphson_value(val) for key, val in value.items() if key not in {"id", "label"}}
    if isinstance(value, list):
        normalized = [_graphson_value(item) for item in value]
        # Flatten single-element lists for readability
        return normalized[0] if len(normalized) == 1 else normalized
    return value


def _ensure_list(value: Any) -> List[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


class JanusGraphTranslator:
    """Convert JanusGraph GraphSON exports into Cypher statements."""

    def __init__(self, graphson: Dict[str, Any], *, id_property: str = "migration_id") -> None:
        self.graphson = graphson.get("graph", graphson)
        self.id_property = id_property

    @classmethod
    def from_file(cls, path: str | Path, *, id_property: str = "migration_id") -> "JanusGraphTranslator":
        data = json.loads(Path(path).read_text())
        return cls(data, id_property=id_property)

    def to_records(self) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        vertices = _ensure_list(self.graphson.get("vertices"))
        edges = _ensure_list(self.graphson.get("edges"))

        nodes: List[Dict[str, Any]] = []
        relationships: List[Dict[str, Any]] = []

        for vertex in vertices:
            vertex_id = str(_graphson_value(vertex.get("id")))
            label = vertex.get("label") or "JanusVertex"
            props = {
                key: _graphson_value(value)
                for key, value in (vertex.get("properties") or {}).items()
            }
            props[self.id_property] = vertex_id
            nodes.append({
                "labels": [label],
                "properties": props,
            })

        for edge in edges:
            start = str(_graphson_value(edge.get("outV")))
            end = str(_graphson_value(edge.get("inV")))
            label = edge.get("label") or "JANUS_EDGE"
            props = _graphson_value(edge.get("properties")) or {}
            rel_key_seed = f"{start}:{label}:{end}:{json.dumps(props, sort_keys=True)}"
            rel_key = hashlib.md5(rel_key_seed.encode("utf-8")).hexdigest()
            relationships.append({
                "start": start,
                "end": end,
                "type": label,
                "properties": props,
                "relKey": rel_key,
            })

        return nodes, relationships

    def to_cypher(self) -> str:
        nodes, relationships = self.to_records()
        nodes_literal = _to_cypher_literal(nodes)
        rels_literal = _to_cypher_literal(relationships)
        id_prop = _escape_identifier(self.id_property)

        node_statement = f"UNWIND {nodes_literal} AS row\nMERGE (n {{{id_prop}: row.properties.{self.id_property}}})\nCALL apoc.create.setLabels(n, row.labels) YIELD node\nSET node += row.properties;"
        rel_statement = (
            "UNWIND {rels} AS row\n"
            "MATCH (start {{{id_prop}: row.start}})\n"
            "MATCH (end {{{id_prop}: row.end}})\n"
            "CALL apoc.merge.relationship(" 
            "start, row.type, {{migrationRelKey: row.relKey}}, row.properties, end, {{migrationRelKey: row.relKey}}, {{migrationRelKey: row.relKey}}) "
            "YIELD rel\n"
            "SET rel += row.properties;"
        ).format(rels=rels_literal, id_prop=id_prop)

        return f"{node_statement}\n{rel_statement}"


def _escape_identifier(identifier: str) -> str:
    return f"`{identifier.replace('`', '``')}`"


def _to_cypher_literal(data: Any) -> str:
    if isinstance(data, list):
        return "[" + ", ".join(_to_cypher_literal(item) for item in data) + "]"
    if isinstance(data, dict):
        parts = []
        for key, value in data.items():
            key_literal = _escape_identifier(str(key))
            parts.append(f"{key_literal}: {_to_cypher_literal(value)}")
        return "{" + ", ".join(parts) + "}"
    if isinstance(data, str):
        return json.dumps(data)
    if isinstance(data, bool):
        return "true" if data else "false"
    if data is None:
        return "null"
    return str(data)
