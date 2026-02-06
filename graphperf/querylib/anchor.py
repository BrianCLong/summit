import os

class QueryShaper:
    def __init__(self, use_hints=True, available_indexes=None):
        self.use_hints = use_hints
        self.available_indexes = available_indexes or []

    def _should_use_hint(self, label, property_name):
        if not self.use_hints: return False
        if not self.available_indexes: return True
        index_key = f"{label}({property_name})"
        return any(index_key in idx for idx in self.available_indexes)

    def anchored_evidence_shortest_path(self, body_query, target_id, depth_max=4):
        hint = ""
        if self._should_use_hint("Evidence", "body"):
            hint = "USING TEXT INDEX s:Evidence(body) "
        cypher = (
            "MATCH (s:Evidence) "
            "WHERE s.body CONTAINS $body_query "
            "MATCH (t:Entity {id: $target_id}) "
            f"{hint}"
            f"MATCH p = shortestPath((s)-[:EVIDENCE_OF*..{depth_max}]->(t)) "
            "RETURN p"
        )
        return cypher, {"body_query": body_query, "target_id": target_id}

    def anchored_entity_to_entity_shortest_path(self, src_id, tgt_id, depth_max=5):
        cypher = (
            "MATCH (s:Entity {id: $src_id}) "
            "MATCH (t:Entity {id: $tgt_id}) "
            f"MATCH p = shortestPath((s)-[*1..{depth_max}]->(t)) "
            "RETURN p"
        )
        return cypher, {"src_id": src_id, "tgt_id": tgt_id}
