// Tenant-specific indexes for multi-tenant queries
// Run with: cypher-shell -u neo4j -p password -f this_file.cypher

// Index entity and relationship tenant fields
CREATE INDEX entity_tenant IF NOT EXISTS FOR (e:Entity) ON (e._tenantId);
CREATE INDEX relationship_tenant IF NOT EXISTS FOR ()-[r]-() ON (r._tenantId);

// Composite index for faster entity lookup by id and tenant
CREATE INDEX entity_id_tenant IF NOT EXISTS FOR (e:Entity) ON (e.id, e._tenantId);
