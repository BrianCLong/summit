// Neo4j Constraints and Indexes for Production Persistence
// Run these commands in Neo4j Browser or via migration script

// Entity constraints
CREATE CONSTRAINT entity_id_unique IF NOT EXISTS
FOR (e:Entity) REQUIRE e.id IS UNIQUE;

CREATE CONSTRAINT entity_tenant_id_exists IF NOT EXISTS
FOR (e:Entity) REQUIRE e.tenantId IS NOT NULL;

// Relationship constraints  
CREATE CONSTRAINT rel_id_unique IF NOT EXISTS
FOR ()-[r:REL]-() REQUIRE r.id IS UNIQUE;

CREATE CONSTRAINT rel_tenant_id_exists IF NOT EXISTS
FOR ()-[r:REL]-() REQUIRE r.tenantId IS NOT NULL;

// Performance indexes
CREATE INDEX entity_tenant_kind IF NOT EXISTS
FOR (e:Entity) ON (e.tenantId, e.kind);

CREATE INDEX entity_tenant_id IF NOT EXISTS  
FOR (e:Entity) ON (e.tenantId);

CREATE INDEX entity_created_at IF NOT EXISTS
FOR (e:Entity) ON (e.createdAt);

CREATE INDEX rel_tenant_type IF NOT EXISTS
FOR ()-[r:REL]-() ON (r.tenantId, r.type);

CREATE INDEX rel_tenant_id IF NOT EXISTS
FOR ()-[r:REL]-() ON (r.tenantId);

CREATE INDEX rel_created_at IF NOT EXISTS
FOR ()-[r:REL]-() ON (r.createdAt);

// Full-text search indexes (optional)
CREATE FULLTEXT INDEX entity_props_fulltext IF NOT EXISTS
FOR (e:Entity) ON EACH [e.props];

CREATE FULLTEXT INDEX entity_labels_fulltext IF NOT EXISTS  
FOR (e:Entity) ON EACH [e.labels];
// Hardening indexes for GraphNode specifically
CREATE CONSTRAINT graphnode_global_id_unique IF NOT EXISTS
FOR (n:GraphNode) REQUIRE n.globalId IS UNIQUE;

CREATE INDEX graphnode_tenant_id IF NOT EXISTS
FOR (n:GraphNode) ON (n.tenantId);

CREATE INDEX graphnode_entity_type IF NOT EXISTS
FOR (n:GraphNode) ON (n.entityType);

// Spatio-temporal indexes
CREATE INDEX graphnode_valid_from IF NOT EXISTS
FOR (n:GraphNode) ON (n.validFrom);

CREATE INDEX graphnode_valid_to IF NOT EXISTS
FOR (n:GraphNode) ON (n.validTo);

CREATE INDEX rel_valid_from IF NOT EXISTS
FOR ()-[r:REL]-() ON (r.validFrom);

CREATE INDEX rel_valid_to IF NOT EXISTS
FOR ()-[r:REL]-() ON (r.validTo);
