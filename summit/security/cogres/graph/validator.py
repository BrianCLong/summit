import json
from typing import Dict, Any, Tuple

class GraphValidator:
    def __init__(self, schema: Dict[str, Any]):
        self.schema = schema

    def validate(self, graph: Dict[str, Any]) -> bool:
        valid, _ = self.validate_full(graph)
        return valid

    def validate_full(self, graph: Dict[str, Any]) -> Tuple[bool, str]:
        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])

        allowed_nodes = self.schema.get("nodes", {})
        allowed_edges = self.schema.get("edges", {})

        node_map = {}
        for node in nodes:
            nid = node.get("id")
            ntype = node.get("type")
            if not nid or not ntype:
                return False, "Node missing id or type"
            if ntype not in allowed_nodes:
                return False, f"Unknown node type: {ntype}"
            node_map[nid] = ntype

        for edge in edges:
            etype = edge.get("type")
            src = edge.get("source")
            tgt = edge.get("target")

            if not etype or not src or not tgt:
                return False, "Edge missing type, source, or target"

            if etype not in allowed_edges:
                return False, f"Unknown edge type: {etype}"

            if src not in node_map:
                return False, f"Edge source not found: {src}"
            if tgt not in node_map:
                return False, f"Edge target not found: {tgt}"

            rule = allowed_edges[etype]
            src_type = node_map[src]
            tgt_type = node_map[tgt]

            if rule["source"] != src_type:
                return False, f"Edge {etype} source must be {rule['source']}, got {src_type}"
            if rule["target"] != tgt_type:
                return False, f"Edge {etype} target must be {rule['target']}, got {tgt_type}"

        return True, "Valid"
