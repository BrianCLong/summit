// Neo4j Constraints for Provenance Ledger Beta
// Migration: 003_provenance_beta_constraints
// Date: 2025-11-20
// Implements Source, Transform nodes and enhanced relationships

// ============================================================================
// SOURCE NODE CONSTRAINTS
// ============================================================================
CREATE CONSTRAINT source_id IF NOT EXISTS
FOR (s:Source)
REQUIRE s.id IS UNIQUE;

CREATE CONSTRAINT source_hash IF NOT EXISTS
FOR (s:Source)
REQUIRE s.source_hash IS UNIQUE;

// Source node indexes
CREATE INDEX source_type_idx IF NOT EXISTS
FOR (s:Source) ON (s.source_type);

CREATE INDEX source_ingestion_idx IF NOT EXISTS
FOR (s:Source) ON (s.ingestion_timestamp);

CREATE INDEX source_created_by_idx IF NOT EXISTS
FOR (s:Source) ON (s.created_by);

// ============================================================================
// TRANSFORM NODE CONSTRAINTS
// ============================================================================
CREATE CONSTRAINT transform_id IF NOT EXISTS
FOR (t:Transform)
REQUIRE t.id IS UNIQUE;

// Transform node indexes
CREATE INDEX transform_type_idx IF NOT EXISTS
FOR (t:Transform) ON (t.transform_type);

CREATE INDEX transform_input_hash_idx IF NOT EXISTS
FOR (t:Transform) ON (t.input_hash);

CREATE INDEX transform_output_hash_idx IF NOT EXISTS
FOR (t:Transform) ON (t.output_hash);

CREATE INDEX transform_execution_idx IF NOT EXISTS
FOR (t:Transform) ON (t.execution_timestamp);

CREATE INDEX transform_algorithm_idx IF NOT EXISTS
FOR (t:Transform) ON (t.algorithm);

// ============================================================================
// ENHANCED CLAIM NODE INDEXES
// ============================================================================
CREATE INDEX claim_type_idx IF NOT EXISTS
FOR (c:Claim) ON (c.claim_type);

CREATE INDEX claim_confidence_idx IF NOT EXISTS
FOR (c:Claim) ON (c.confidence);

CREATE INDEX claim_created_by_idx IF NOT EXISTS
FOR (c:Claim) ON (c.created_by);

// ============================================================================
// ENHANCED EVIDENCE NODE INDEXES
// ============================================================================
CREATE INDEX evidence_type_idx IF NOT EXISTS
FOR (e:Evidence) ON (e.evidence_type);

CREATE INDEX evidence_classification_idx IF NOT EXISTS
FOR (e:Evidence) ON (e.classification_level);

CREATE INDEX evidence_registered_by_idx IF NOT EXISTS
FOR (e:Evidence) ON (e.registered_by);

// ============================================================================
// MANIFEST NODE (for export tracking)
// ============================================================================
CREATE CONSTRAINT manifest_id IF NOT EXISTS
FOR (m:Manifest)
REQUIRE m.id IS UNIQUE;

CREATE CONSTRAINT manifest_merkle_root IF NOT EXISTS
FOR (m:Manifest)
REQUIRE m.merkle_root IS UNIQUE;

CREATE INDEX manifest_created_at_idx IF NOT EXISTS
FOR (m:Manifest) ON (m.created_at);

CREATE INDEX manifest_bundle_id_idx IF NOT EXISTS
FOR (m:Manifest) ON (m.bundle_id);

// ============================================================================
// RELATIONSHIP TYPE DOCUMENTATION
// ============================================================================
// The following relationships should be created by the application:
//
// SOURCE RELATIONSHIPS:
// - (Claim)-[:DERIVED_FROM]->(Source)
// - (Evidence)-[:SOURCED_FROM]->(Source)
// - (Source)-[:HAS_LICENSE]->(License)
// - (Source)-[:HANDLED_BY]->(User) // custody chain
//
// TRANSFORM RELATIONSHIPS:
// - (Transform)-[:FOLLOWS]->(Transform) // transform chain
// - (Transform)-[:EXECUTED_BY]->(User)
// - (Claim)-[:TRANSFORMED_BY]->(Transform)
// - (Evidence)-[:TRANSFORMED_BY]->(Transform)
//
// CLAIM RELATIONSHIPS (existing + new):
// - (Claim)-[:SUPPORTED_BY]->(Evidence)
// - (Claim)-[:CONTRADICTS]->(Claim)
// - (Claim)-[:SUPPORTS]->(Claim) // corroboration
// - (Claim)-[:HAS_LICENSE]->(License)
// - (Claim)-[:DERIVED_FROM]->(Source)
// - (Claim)-[:CREATED_BY]->(User)
// - (Claim)-[:PART_OF]->(Investigation)
//
// EVIDENCE RELATIONSHIPS (existing + new):
// - (Evidence)-[:SUPPORTS_CLAIM]->(Claim)
// - (Evidence)-[:HAS_LICENSE]->(License)
// - (Evidence)-[:STORED_AT]->(StorageLocation) // optional
//
// MANIFEST RELATIONSHIPS:
// - (Manifest)-[:INCLUDES]->(Claim)
// - (Manifest)-[:INCLUDES]->(Evidence)
// - (Manifest)-[:INCLUDES]->(Source)
// - (Manifest)-[:REFERENCES]->(License)
// - (Manifest)-[:CREATED_BY]->(User)
// - (Manifest)-[:VERIFIED_BY]->(User) // verification logs

// ============================================================================
// SAMPLE QUERIES FOR VALIDATION (commented out, for reference)
// ============================================================================

// Find complete provenance chain for a claim
// MATCH path = (c:Claim {id: $claimId})-[:DERIVED_FROM]->(s:Source)
// OPTIONAL MATCH (c)-[:TRANSFORMED_BY]->(t:Transform)
// OPTIONAL MATCH (t)-[:FOLLOWS*0..]->(parent:Transform)
// RETURN c, s, collect(DISTINCT t) as transforms, collect(DISTINCT parent) as transform_chain

// Find all claims contradicting each other
// MATCH (c1:Claim)-[:CONTRADICTS]-(c2:Claim)
// RETURN c1, c2

// Find claims with specific license restrictions
// MATCH (c:Claim)-[:HAS_LICENSE]->(l:License {license_type: 'classified'})
// RETURN c, l

// Find transform chains longer than N steps
// MATCH path = (t1:Transform)-[:FOLLOWS*3..]->(tn:Transform)
// RETURN path, length(path) as chain_length
// ORDER BY chain_length DESC

// Find evidence with multiple sources (potential aggregation)
// MATCH (e:Evidence)-[:SOURCED_FROM]->(s:Source)
// WITH e, collect(s) as sources
// WHERE size(sources) > 1
// RETURN e, sources

// ============================================================================
// MIGRATION METADATA
// ============================================================================
// Migration: 003_provenance_beta_constraints
// Version: 1.0.0
// Date: 2025-11-20
// Description: Neo4j constraints and indexes for Provenance Ledger Beta
//              Adds Source, Transform nodes and enhanced claim/evidence tracking
