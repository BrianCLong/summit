// IntelGraph Neo4j Constraints and Indexes for Import Services
// This migration adds constraints and indexes to support efficient data import and querying

// ==============================================================================
// CONSTRAINTS FOR DATA INTEGRITY
// ==============================================================================

// Composite key constraints for CSV imports (tenant + composite key uniqueness)
CREATE CONSTRAINT csv_entity_unique IF NOT EXISTS
FOR (n:Entity) REQUIRE (n._compositeKey, n._tenantId) IS UNIQUE;

// STIX ID constraints for STIX imports
CREATE CONSTRAINT stix_object_unique IF NOT EXISTS
FOR (n:STIX_OBJECT) REQUIRE (n.stix_id, n._tenantId) IS UNIQUE;

CREATE CONSTRAINT threat_actor_stix_unique IF NOT EXISTS
FOR (n:THREAT_ACTOR) REQUIRE (n.stix_id, n._tenantId) IS UNIQUE;

CREATE CONSTRAINT malware_stix_unique IF NOT EXISTS
FOR (n:MALWARE) REQUIRE (n.stix_id, n._tenantId) IS UNIQUE;

CREATE CONSTRAINT indicator_stix_unique IF NOT EXISTS
FOR (n:INDICATOR) REQUIRE (n.stix_id, n._tenantId) IS UNIQUE;

CREATE CONSTRAINT attack_pattern_stix_unique IF NOT EXISTS
FOR (n:ATTACK_PATTERN) REQUIRE (n.stix_id, n._tenantId) IS UNIQUE;

CREATE CONSTRAINT campaign_stix_unique IF NOT EXISTS
FOR (n:CAMPAIGN) REQUIRE (n.stix_id, n._tenantId) IS UNIQUE;

CREATE CONSTRAINT vulnerability_stix_unique IF NOT EXISTS
FOR (n:VULNERABILITY) REQUIRE (n.stix_id, n._tenantId) IS UNIQUE;

// ==============================================================================
// INDEXES FOR PERFORMANCE
// ==============================================================================

// Tenant isolation indexes
CREATE INDEX entity_tenant_idx IF NOT EXISTS FOR (n:Entity) ON (n._tenantId);
CREATE INDEX person_tenant_idx IF NOT EXISTS FOR (n:PERSON) ON (n._tenantId);
CREATE INDEX organization_tenant_idx IF NOT EXISTS FOR (n:ORGANIZATION) ON (n._tenantId);
CREATE INDEX location_tenant_idx IF NOT EXISTS FOR (n:LOCATION) ON (n._tenantId);

// Import job tracking indexes
CREATE INDEX entity_import_job_idx IF NOT EXISTS FOR (n:Entity) ON (n._importJobId);
CREATE INDEX entity_investigation_idx IF NOT EXISTS FOR (n:Entity) ON (n._investigationId);

// STIX-specific indexes
CREATE INDEX stix_type_idx IF NOT EXISTS FOR (n:STIX_OBJECT) ON (n.stix_type);
CREATE INDEX threat_actor_type_idx IF NOT EXISTS FOR (n:THREAT_ACTOR) ON (n.stix_type);
CREATE INDEX malware_type_idx IF NOT EXISTS FOR (n:MALWARE) ON (n.stix_type);
CREATE INDEX indicator_pattern_idx IF NOT EXISTS FOR (n:INDICATOR) ON (n.pattern);
CREATE INDEX vulnerability_cve_idx IF NOT EXISTS FOR (n:VULNERABILITY) ON (n.cve_id);

// Temporal indexes for time-based queries
CREATE INDEX entity_created_idx IF NOT EXISTS FOR (n:Entity) ON (n._createdAt);
CREATE INDEX entity_updated_idx IF NOT EXISTS FOR (n:Entity) ON (n._updatedAt);

// Source and provenance indexes
CREATE INDEX entity_source_idx IF NOT EXISTS FOR (n:Entity) ON (n._source);
CREATE INDEX entity_source_file_idx IF NOT EXISTS FOR (n:Entity) ON (n._sourceFile);

// Text search indexes for common properties
CREATE INDEX entity_name_idx IF NOT EXISTS FOR (n:Entity) ON (n.name);
CREATE INDEX entity_description_idx IF NOT EXISTS FOR (n:Entity) ON (n.description);

// ==============================================================================
// RELATIONSHIP CONSTRAINTS AND INDEXES
// ==============================================================================

// STIX relationship constraints
CREATE CONSTRAINT stix_relationship_unique IF NOT EXISTS
FOR ()-[r:USES]-() REQUIRE (r.stix_id, r._tenantId) IS UNIQUE;

CREATE CONSTRAINT stix_indicates_unique IF NOT EXISTS
FOR ()-[r:INDICATES]-() REQUIRE (r.stix_id, r._tenantId) IS UNIQUE;

CREATE CONSTRAINT stix_targets_unique IF NOT EXISTS
FOR ()-[r:TARGETS]-() REQUIRE (r.stix_id, r._tenantId) IS UNIQUE;

// Relationship indexes
CREATE INDEX rel_tenant_idx IF NOT EXISTS FOR ()-[r]-() ON (r._tenantId);
CREATE INDEX rel_import_job_idx IF NOT EXISTS FOR ()-[r]-() ON (r._importJobId);
CREATE INDEX rel_source_idx IF NOT EXISTS FOR ()-[r]-() ON (r._source);
CREATE INDEX rel_created_idx IF NOT EXISTS FOR ()-[r]-() ON (r._createdAt);

// ==============================================================================
// SAMPLE DATA CONSTRAINTS (FOR DEMO)
// ==============================================================================

// Demo data constraints for development
CREATE CONSTRAINT demo_person_unique IF NOT EXISTS
FOR (n:DEMO_PERSON) REQUIRE (n.name, n._tenantId) IS UNIQUE;

CREATE CONSTRAINT demo_org_unique IF NOT EXISTS
FOR (n:DEMO_ORGANIZATION) REQUIRE (n.name, n._tenantId) IS UNIQUE;

// ==============================================================================
// UTILITY PROCEDURES (IF USING APOC)
// ==============================================================================

// Note: These would only work if APOC is installed
// Procedure to validate data quality after import
/*
CALL apoc.custom.asProcedure(
  'import.validateDataQuality',
  'MATCH (n) WHERE n._importJobId = $jobId 
   RETURN 
     count(n) as totalNodes,
     count(DISTINCT n._tenantId) as tenantCount,
     collect(DISTINCT labels(n)) as nodeTypes,
     min(n._createdAt) as firstCreated,
     max(n._createdAt) as lastCreated',
  'read',
  [['totalNodes', 'INTEGER'], ['tenantCount', 'INTEGER'], ['nodeTypes', 'LIST OF STRING'], 
   ['firstCreated', 'STRING'], ['lastCreated', 'STRING']],
  [['jobId', 'STRING']]
);
*/

// ==============================================================================
// VERIFICATION QUERIES
// ==============================================================================

// Verify constraints were created successfully
SHOW CONSTRAINTS;

// Verify indexes were created successfully  
SHOW INDEXES;

// Sample validation query to check constraint effectiveness
// (Run after some data is imported)
/*
MATCH (n)
WHERE n._tenantId IS NOT NULL
WITH n._tenantId as tenant, labels(n) as nodeLabels, count(*) as nodeCount
RETURN tenant, nodeLabels, nodeCount
ORDER BY tenant, nodeCount DESC;
*/