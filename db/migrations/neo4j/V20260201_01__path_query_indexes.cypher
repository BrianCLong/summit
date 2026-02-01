// V20260201_01__path_query_indexes.cypher
// Neo4j/Cypher performance playbook: indexes for path queries

// TEXT index on Evidence.body for substring searches (CONTAINS)
CREATE TEXT INDEX idx_evidence_body IF NOT EXISTS
FOR (n:Evidence) ON (n.body);

// RANGE index on Event.timestamp for temporal filtering
CREATE RANGE INDEX idx_event_timestamp IF NOT EXISTS
FOR (n:Event) ON (n.timestamp);

// RANGE index on relationship confidence for pruning expansions
// Note: Relationship indexes are scoped to a specific relationship type
CREATE RANGE INDEX idx_evidence_of_confidence IF NOT EXISTS
FOR ()-[r:EVIDENCE_OF]-() ON (r.confidence);
