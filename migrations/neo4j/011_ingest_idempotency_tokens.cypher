// Ingest idempotency constraints for retried/concurrent upserts
CREATE CONSTRAINT entity_idempotency_token_unique IF NOT EXISTS
FOR (e:Entity) REQUIRE e.idempotency_token IS UNIQUE;

CREATE CONSTRAINT ingest_relationship_idempotency_token_unique IF NOT EXISTS
FOR (s:IngestRelationshipIdempotency) REQUIRE s.idempotency_token IS UNIQUE;

CREATE INDEX ingest_relationship_idempotency_relationship_id_idx IF NOT EXISTS
FOR (s:IngestRelationshipIdempotency) ON (s.relationshipId);
