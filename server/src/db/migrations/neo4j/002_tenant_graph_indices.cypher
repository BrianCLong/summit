// Tenant Graph Slice v0 - Neo4j Indices and Constraints
// Creates indices for performant graph queries

// Constraints for unique entity IDs
CREATE CONSTRAINT entity_id_unique IF NOT EXISTS
FOR (e:Entity) REQUIRE e.id IS UNIQUE;

// Constraints per entity type
CREATE CONSTRAINT person_id_unique IF NOT EXISTS
FOR (p:Person) REQUIRE p.id IS UNIQUE;

CREATE CONSTRAINT organization_id_unique IF NOT EXISTS
FOR (o:Organization) REQUIRE o.id IS UNIQUE;

CREATE CONSTRAINT asset_id_unique IF NOT EXISTS
FOR (a:Asset) REQUIRE a.id IS UNIQUE;

CREATE CONSTRAINT event_id_unique IF NOT EXISTS
FOR (e:Event) REQUIRE e.id IS UNIQUE;

CREATE CONSTRAINT indicator_id_unique IF NOT EXISTS
FOR (i:Indicator) REQUIRE i.id IS UNIQUE;

// Composite index for tenant isolation
CREATE INDEX entity_tenant_idx IF NOT EXISTS
FOR (e:Entity) ON (e.tenantId);

// Index for timestamps (temporal queries)
CREATE INDEX entity_created_idx IF NOT EXISTS
FOR (e:Entity) ON (e.createdAt);

// Full-text search index (key for p95 < 350ms SLO)
CALL db.index.fulltext.createNodeIndex(
  'entitySearch',
  ['Person', 'Organization', 'Asset', 'Event', 'Indicator'],
  ['name', 'description', 'value', 'eventType', 'indicatorType'],
  {
    analyzer: 'standard-folding',
    eventually_consistent: false
  }
) IF NOT EXISTS;

// Relationship indices for traversal performance
CREATE INDEX relationship_type_idx IF NOT EXISTS
FOR ()-[r:MEMBER_OF]-() ON (r.confidence);

CREATE INDEX relationship_owns_idx IF NOT EXISTS
FOR ()-[r:OWNS]-() ON (r.confidence);

CREATE INDEX relationship_mentioned_idx IF NOT EXISTS
FOR ()-[r:MENTIONED_IN]-() ON (r.confidence);

CREATE INDEX relationship_related_idx IF NOT EXISTS
FOR ()-[r:RELATED_TO]-() ON (r.confidence);

// Comments
CALL apoc.meta.comment.add('Entity', 'Multi-tenant entity node with provenance');
