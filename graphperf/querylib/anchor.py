import os

class QueryShaper:
    """
    Query shaping layer to ensure path queries are anchored and optionally
    injected with planner hints.
    """

    def __init__(self, use_hints=True):
        self.use_hints = use_hints

    def anchored_evidence_shortest_path(self, body_query, target_id, depth_max=4):
        """
        Generates a Cypher query for shortest path between an Evidence node
        (searched by body text) and a target Entity.
        """
        # Note: We use the TEXT index hint if enabled
        hint = "USING TEXT INDEX s:Evidence(body) " if self.use_hints else ""

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
        """
        Generates a Cypher query for shortest path between two specific entities.
        Ensures both endpoints are bound to cardinality 1 before shortestPath call.
        """
        cypher = (
            "MATCH (s:Entity {id: $src_id}) "
            "MATCH (t:Entity {id: $tgt_id}) "
            f"MATCH p = shortestPath((s)-[*1..{depth_max}]->(t)) "
            "RETURN p"
        )
        return cypher, {"src_id": src_id, "tgt_id": tgt_id}

    def confidence_filtered_expansion(self, evidence_id, min_confidence, depth_max=3):
        """
        Generates a variable-length expansion query with a confidence filter
        on relationships.
        """
        # Hint for relationship range index
        hint = "USING INDEX r:EVIDENCE_OF(confidence) " if self.use_hints else ""

        cypher = (
            "MATCH (s:Evidence {id: $evidence_id}) "
            f"MATCH (s)-[r:EVIDENCE_OF*1..{depth_max}]->(t:Entity) "
            "WHERE all(rel in r WHERE rel.confidence >= $min_confidence) "
            "RETURN t, [rel in r | rel.confidence] as confidences"
        )
        # Note: Hints on variable length relationships can be tricky in some Neo4j versions,
        # usually applied to the first bound relationship.
        return cypher, {"evidence_id": evidence_id, "min_confidence": min_confidence}
