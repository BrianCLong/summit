// Canonical Graph Schema Migration for Neo4j
// GA-ready entity types and ER support
// Author: Summit Team
// Date: 2025-11-20

// =========================================================================
// 1. Create constraint for ResolutionCluster nodes
// =========================================================================

CREATE CONSTRAINT resolution_cluster_id IF NOT EXISTS
FOR (rc:ResolutionCluster) REQUIRE rc.id IS UNIQUE;

// =========================================================================
// 2. Create indexes for canonical ID and ER
// =========================================================================

// Canonical ID index (for ER lookups)
CREATE INDEX entity_canonical_id IF NOT EXISTS
FOR (e:Entity) ON (e.canonicalId, e.tenantId);

// Canonical ID alone
CREATE INDEX entity_canonical_id_simple IF NOT EXISTS
FOR (e:Entity) ON (e.canonicalId);

// =========================================================================
// 3. Create indexes for policy labels
// =========================================================================

CREATE INDEX entity_sensitivity IF NOT EXISTS
FOR (e:Entity) ON (e.sensitivity);

CREATE INDEX entity_clearance IF NOT EXISTS
FOR (e:Entity) ON (e.clearance);

CREATE INDEX entity_retention_class IF NOT EXISTS
FOR (e:Entity) ON (e.retentionClass);

CREATE INDEX entity_origin IF NOT EXISTS
FOR (e:Entity) ON (e.origin);

// =========================================================================
// 4. Create indexes for temporal fields (bitemporal)
// =========================================================================

CREATE INDEX entity_valid_from IF NOT EXISTS
FOR (e:Entity) ON (e.validFrom);

CREATE INDEX entity_valid_to IF NOT EXISTS
FOR (e:Entity) ON (e.validTo);

CREATE INDEX entity_recorded_at IF NOT EXISTS
FOR (e:Entity) ON (e.recordedAt);

// Composite temporal index
CREATE INDEX entity_temporal IF NOT EXISTS
FOR (e:Entity) ON (e.validFrom, e.validTo);

// =========================================================================
// 5. Create indexes for new relationship types
// =========================================================================

// Evidence & provenance relationships
CREATE INDEX rel_supports IF NOT EXISTS
FOR ()-[r:SUPPORTS]-() ON (r.confidence);

CREATE INDEX rel_contradicts IF NOT EXISTS
FOR ()-[r:CONTRADICTS]-() ON (r.confidence);

CREATE INDEX rel_derived_from IF NOT EXISTS
FOR ()-[r:DERIVED_FROM]-() ON (r.timestamp);

CREATE INDEX rel_cites IF NOT EXISTS
FOR ()-[r:CITES]-() ON (r.timestamp);

// Authority & governance relationships
CREATE INDEX rel_authorized_by IF NOT EXISTS
FOR ()-[r:AUTHORIZED_BY]-() ON (r.validFrom, r.validTo);

CREATE INDEX rel_governed_by IF NOT EXISTS
FOR ()-[r:GOVERNED_BY]-() ON (r.legalBasis);

// Temporal relationships
CREATE INDEX rel_precedes IF NOT EXISTS
FOR ()-[r:PRECEDES]-() ON (r.since);

CREATE INDEX rel_follows IF NOT EXISTS
FOR ()-[r:FOLLOWS]-() ON (r.since);

// =========================================================================
// 6. Create indexes for new entity types
// =========================================================================

// Vehicle entities
CREATE INDEX vehicle_entity_idx IF NOT EXISTS
FOR (e:Entity) ON (e.type) WHERE e.type = 'VEHICLE';

// Infrastructure entities
CREATE INDEX infrastructure_entity_idx IF NOT EXISTS
FOR (e:Entity) ON (e.type) WHERE e.type = 'INFRASTRUCTURE';

// Financial instrument entities
CREATE INDEX financial_instrument_entity_idx IF NOT EXISTS
FOR (e:Entity) ON (e.type) WHERE e.type = 'FINANCIAL_INSTRUMENT';

// Claim entities
CREATE INDEX claim_entity_idx IF NOT EXISTS
FOR (e:Entity) ON (e.type) WHERE e.type = 'CLAIM';

// Evidence entities
CREATE INDEX evidence_entity_idx IF NOT EXISTS
FOR (e:Entity) ON (e.type) WHERE e.type = 'EVIDENCE';

// Hypothesis entities
CREATE INDEX hypothesis_entity_idx IF NOT EXISTS
FOR (e:Entity) ON (e.type) WHERE e.type = 'HYPOTHESIS';

// Authority entities
CREATE INDEX authority_entity_idx IF NOT EXISTS
FOR (e:Entity) ON (e.type) WHERE e.type = 'AUTHORITY';

// License entities
CREATE INDEX license_entity_idx IF NOT EXISTS
FOR (e:Entity) ON (e.type) WHERE e.type = 'LICENSE';

// =========================================================================
// 7. Create indexes for provenance and verification
// =========================================================================

CREATE INDEX entity_verification_status IF NOT EXISTS
FOR (e:Entity) ON (e.verificationStatus);

CREATE INDEX entity_trust_score IF NOT EXISTS
FOR (e:Entity) ON (e.trustScore);

CREATE INDEX entity_source IF NOT EXISTS
FOR (e:Entity) ON (e.source);

// =========================================================================
// 8. Create ResolutionCluster node label
// =========================================================================

// ResolutionCluster nodes will be created dynamically by the ER service
// This is just documentation of the schema

// Example ResolutionCluster node:
// {
//   id: UUID,
//   tenantId: String,
//   entityIds: [UUID],
//   canonicalEntityId: UUID,
//   method: String,
//   algorithm: String,
//   confidence: Float,
//   createdAt: DateTime,
//   lastUpdated: DateTime,
//   version: Int
// }

// Relationships:
// (ResolutionCluster)-[:CONTAINS]->(Entity) - all entities in cluster
// (ResolutionCluster)-[:CANONICAL]->(Entity) - the master entity

// =========================================================================
// 9. Temporal query utilities
// =========================================================================

// Add procedure for temporal entity lookup (optional - requires APOC)
// CALL apoc.custom.asProcedure(
//   'entityAtTime',
//   'MATCH (e:Entity)
//    WHERE e.id = $entityId
//      AND e.validFrom <= $timestamp
//      AND (e.validTo IS NULL OR e.validTo > $timestamp)
//    RETURN e',
//   'read',
//   [['entity', 'NODE']]
// );

// =========================================================================
// Migration Complete
// =========================================================================

// Verification queries (run manually):
//
// // Check constraints
// CALL db.constraints()
//
// // Check indexes
// CALL db.indexes()
//
// // Count entities by type
// MATCH (e:Entity)
// RETURN e.type AS type, COUNT(*) AS count
// ORDER BY count DESC
