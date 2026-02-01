// path_templates.cypher
// Approved query templates for GraphPerf path queries

/**
 * 1. Index-anchored Evidence search -> shortest path
 * Anchoring on Evidence.body using TEXT index.
 * We pre-bind 's' and 't' to ensure the shortestPath operator uses bidirectional BFS.
 */
MATCH (s:Evidence)
WHERE s.body CONTAINS $body_query
MATCH (t:Entity {id: $target_id})
USING INDEX s:Evidence(body)
MATCH p = shortestPath((s)-[:EVIDENCE_OF*..4]->(t))
RETURN p;

/**
 * 2. Bounded shortestPath between pre-bound entities
 * Triggers bidirectional BFS efficiently when both endpoints are cardinality <= 1.
 */
MATCH (s:Entity {id: $source_id})
MATCH (t:Entity {id: $target_id})
MATCH p = shortestPath((s)-[*1..5]->(t))
RETURN p;

/**
 * 3. Confidence-filtered variable-length expansion
 * Leverages relationship range index on 'confidence'.
 */
MATCH (s:Evidence {id: $evidence_id})
MATCH (s)-[r:EVIDENCE_OF*1..3]->(t:Entity)
WHERE all(rel in r WHERE rel.confidence >= $min_confidence)
RETURN t, [rel in r | rel.confidence] as confidences;
