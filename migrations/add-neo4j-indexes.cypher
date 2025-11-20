// Performance Optimization: Add Neo4j Indexes and Constraints
// This migration adds indexes and constraints for optimal graph query performance

// ============================================================================
// ENTITY NODE INDEXES
// ============================================================================

// Single property indexes
CREATE INDEX idx_entity_id IF NOT EXISTS FOR (e:Entity) ON (e.id);
CREATE INDEX idx_entity_type IF NOT EXISTS FOR (e:Entity) ON (e.type);
CREATE INDEX idx_entity_tenant IF NOT EXISTS FOR (e:Entity) ON (e.tenantId);
CREATE INDEX idx_entity_created IF NOT EXISTS FOR (e:Entity) ON (e.createdAt);
CREATE INDEX idx_entity_updated IF NOT EXISTS FOR (e:Entity) ON (e.updatedAt);
CREATE INDEX idx_entity_confidence IF NOT EXISTS FOR (e:Entity) ON (e.confidence);
CREATE INDEX idx_entity_canonical IF NOT EXISTS FOR (e:Entity) ON (e.canonicalId);

// Composite indexes for common query patterns
CREATE INDEX idx_entity_tenant_type IF NOT EXISTS FOR (e:Entity) ON (e.tenantId, e.type);
CREATE INDEX idx_entity_tenant_created IF NOT EXISTS FOR (e:Entity) ON (e.tenantId, e.createdAt);
CREATE INDEX idx_entity_type_confidence IF NOT EXISTS FOR (e:Entity) ON (e.type, e.confidence);

// Temporal indexes for bitemporal queries
CREATE INDEX idx_entity_valid_from IF NOT EXISTS FOR (e:Entity) ON (e.validFrom);
CREATE INDEX idx_entity_valid_to IF NOT EXISTS FOR (e:Entity) ON (e.validTo);

// Full-text search indexes
CREATE FULLTEXT INDEX entity_name_fulltext IF NOT EXISTS FOR (e:Entity) ON EACH [e.name];
CREATE FULLTEXT INDEX entity_description_fulltext IF NOT EXISTS FOR (e:Entity) ON EACH [e.description];

// ============================================================================
// RELATIONSHIP INDEXES
// ============================================================================

// Relationship type indexes
CREATE INDEX idx_relationship_type IF NOT EXISTS FOR ()-[r:RELATED_TO]-() ON (r.type);
CREATE INDEX idx_relationship_tenant IF NOT EXISTS FOR ()-[r:RELATED_TO]-() ON (r.tenantId);
CREATE INDEX idx_relationship_created IF NOT EXISTS FOR ()-[r:RELATED_TO]-() ON (r.createdAt);
CREATE INDEX idx_relationship_confidence IF NOT EXISTS FOR ()-[r:RELATED_TO]-() ON (r.confidence);

// Composite relationship indexes
CREATE INDEX idx_relationship_tenant_type IF NOT EXISTS FOR ()-[r:RELATED_TO]-() ON (r.tenantId, r.type);

// Temporal relationship indexes
CREATE INDEX idx_relationship_valid_from IF NOT EXISTS FOR ()-[r:RELATED_TO]-() ON (r.validFrom);
CREATE INDEX idx_relationship_valid_to IF NOT EXISTS FOR ()-[r:RELATED_TO]-() ON (r.validTo);

// ============================================================================
// INVESTIGATION NODE INDEXES
// ============================================================================

CREATE INDEX idx_investigation_id IF NOT EXISTS FOR (i:Investigation) ON (i.id);
CREATE INDEX idx_investigation_status IF NOT EXISTS FOR (i:Investigation) ON (i.status);
CREATE INDEX idx_investigation_tenant IF NOT EXISTS FOR (i:Investigation) ON (i.tenantId);
CREATE INDEX idx_investigation_priority IF NOT EXISTS FOR (i:Investigation) ON (i.priority);
CREATE INDEX idx_investigation_created IF NOT EXISTS FOR (i:Investigation) ON (i.createdAt);

// Composite investigation indexes
CREATE INDEX idx_investigation_tenant_status IF NOT EXISTS FOR (i:Investigation) ON (i.tenantId, i.status);
CREATE INDEX idx_investigation_tenant_priority IF NOT EXISTS FOR (i:Investigation) ON (i.tenantId, i.priority);

// Full-text search
CREATE FULLTEXT INDEX investigation_name_fulltext IF NOT EXISTS FOR (i:Investigation) ON EACH [i.name];

// ============================================================================
// USER NODE INDEXES
// ============================================================================

CREATE INDEX idx_user_id IF NOT EXISTS FOR (u:User) ON (u.id);
CREATE INDEX idx_user_email IF NOT EXISTS FOR (u:User) ON (u.email);
CREATE INDEX idx_user_tenant IF NOT EXISTS FOR (u:User) ON (u.tenantId);
CREATE INDEX idx_user_role IF NOT EXISTS FOR (u:User) ON (u.role);

// Composite user indexes
CREATE INDEX idx_user_tenant_email IF NOT EXISTS FOR (u:User) ON (u.tenantId, u.email);
CREATE INDEX idx_user_tenant_role IF NOT EXISTS FOR (u:User) ON (u.tenantId, u.role);

// ============================================================================
// SOURCE NODE INDEXES (if using Source nodes)
// ============================================================================

CREATE INDEX idx_source_id IF NOT EXISTS FOR (s:Source) ON (s.id);
CREATE INDEX idx_source_tenant IF NOT EXISTS FOR (s:Source) ON (s.tenantId);
CREATE INDEX idx_source_type IF NOT EXISTS FOR (s:Source) ON (s.type);
CREATE INDEX idx_source_url IF NOT EXISTS FOR (s:Source) ON (s.url);

// ============================================================================
// UNIQUENESS CONSTRAINTS
// ============================================================================

// Entity constraints
CREATE CONSTRAINT constraint_entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT constraint_entity_tenant_id IF NOT EXISTS FOR (e:Entity) REQUIRE (e.id, e.tenantId) IS NODE KEY;

// Investigation constraints
CREATE CONSTRAINT constraint_investigation_id IF NOT EXISTS FOR (i:Investigation) REQUIRE i.id IS UNIQUE;

// User constraints
CREATE CONSTRAINT constraint_user_email_tenant IF NOT EXISTS FOR (u:User) REQUIRE (u.email, u.tenantId) IS UNIQUE;

// Relationship constraints
CREATE CONSTRAINT constraint_relationship_id IF NOT EXISTS FOR ()-[r:RELATED_TO]-() REQUIRE r.id IS UNIQUE;

// ============================================================================
// EXISTENCE CONSTRAINTS (ensure critical properties exist)
// ============================================================================

// Ensure entities have required properties
CREATE CONSTRAINT constraint_entity_has_tenant IF NOT EXISTS FOR (e:Entity) REQUIRE e.tenantId IS NOT NULL;
CREATE CONSTRAINT constraint_entity_has_type IF NOT EXISTS FOR (e:Entity) REQUIRE e.type IS NOT NULL;

// Ensure investigations have required properties
CREATE CONSTRAINT constraint_investigation_has_tenant IF NOT EXISTS FOR (i:Investigation) REQUIRE i.tenantId IS NOT NULL;
CREATE CONSTRAINT constraint_investigation_has_status IF NOT EXISTS FOR (i:Investigation) REQUIRE i.status IS NOT NULL;

// Ensure relationships have tenant
CREATE CONSTRAINT constraint_relationship_has_tenant IF NOT EXISTS FOR ()-[r:RELATED_TO]-() REQUIRE r.tenantId IS NOT NULL;

// ============================================================================
// SPECIALIZED INDEXES FOR GRAPH ALGORITHMS
// ============================================================================

// Range indexes for numeric properties (better for comparisons)
CREATE RANGE INDEX idx_entity_confidence_range IF NOT EXISTS FOR (e:Entity) ON (e.confidence);
CREATE RANGE INDEX idx_relationship_confidence_range IF NOT EXISTS FOR ()-[r:RELATED_TO]-() ON (r.confidence);

// Text indexes for string matching
CREATE TEXT INDEX idx_entity_type_text IF NOT EXISTS FOR (e:Entity) ON (e.type);
CREATE TEXT INDEX idx_relationship_type_text IF NOT EXISTS FOR ()-[r:RELATED_TO]-() ON (r.type);

// ============================================================================
// DISPLAY INDEX INFORMATION
// ============================================================================

// Show all indexes
SHOW INDEXES;

// Show all constraints
SHOW CONSTRAINTS;

// ============================================================================
// QUERY OPTIMIZATION EXAMPLES
// ============================================================================

// Example 1: Find entities by tenant and type (uses idx_entity_tenant_type)
// MATCH (e:Entity {tenantId: $tenantId, type: $type})
// RETURN e

// Example 2: Find recent entities for tenant (uses idx_entity_tenant_created)
// MATCH (e:Entity {tenantId: $tenantId})
// WHERE e.createdAt >= datetime() - duration('P7D')
// RETURN e
// ORDER BY e.createdAt DESC

// Example 3: Find high-confidence relationships (uses idx_relationship_confidence_range)
// MATCH ()-[r:RELATED_TO]->()
// WHERE r.confidence > 0.8 AND r.tenantId = $tenantId
// RETURN r

// Example 4: Full-text search on entity names
// CALL db.index.fulltext.queryNodes('entity_name_fulltext', $searchTerm)
// YIELD node, score
// WHERE node.tenantId = $tenantId
// RETURN node, score
// ORDER BY score DESC

// ============================================================================
// PERFORMANCE NOTES
// ============================================================================

// 1. Always filter by tenantId first in multi-tenant queries
// 2. Use PROFILE or EXPLAIN to analyze query performance
// 3. Consider using parameters ($param) instead of literals
// 4. Limit result sets with LIMIT clause
// 5. Use WITH clause to break complex queries into steps
// 6. Avoid Cartesian products (multiple MATCH without relationships)
// 7. Use composite indexes for common WHERE combinations
// 8. Full-text indexes are case-insensitive by default
// 9. Range indexes are better for numeric comparisons
// 10. Node key constraints ensure both uniqueness and existence

// ============================================================================
// MAINTENANCE QUERIES
// ============================================================================

// Check index usage statistics (Neo4j Enterprise)
// CALL db.stats.retrieve('QUERIES')

// Clear query cache
// CALL db.clearQueryCaches();

// Warm up page cache with common query
// MATCH (e:Entity) WHERE e.tenantId = $tenantId RETURN count(e);
