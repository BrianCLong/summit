// Graph validation constraints for ingestion hardening
// Apply with: cypher-shell -u $NEO4J_USER -p $NEO4J_PASSWORD -f 2025-10-05_graph_validation_rules.cypher

// Ensure all Entity nodes include tenant and classification data
CREATE CONSTRAINT entity_requires_tenant IF NOT EXISTS FOR (e:Entity)
REQUIRE e.tenantId IS NOT NULL;

CREATE CONSTRAINT entity_requires_kind IF NOT EXISTS FOR (e:Entity)
REQUIRE e.kind IS NOT NULL;

CREATE CONSTRAINT entity_requires_name IF NOT EXISTS FOR (e:Entity)
REQUIRE e.name IS NOT NULL;

// Ensure relationships carry tenant ownership metadata
CREATE CONSTRAINT relationship_requires_tenant IF NOT EXISTS FOR ()-[r]-()
REQUIRE r.tenantId IS NOT NULL;

// Optional validation query: flag relationships using disallowed types
// Adjust the allow list to match the application configuration.
WITH ['ASSOCIATED_WITH', 'MENTIONS', 'COMMUNICATED_WITH', 'LOCATED_AT'] AS allowedTypes
MATCH ()-[r]-()
WHERE NOT type(r) IN allowedTypes
RETURN DISTINCT type(r) AS disallowedRelationshipTypes;
