// Constraints
CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT relationship_id_unique IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() REQUIRE r.id IS UNIQUE;

// Indexes
CREATE INDEX entity_type_idx IF NOT EXISTS FOR (e:Entity) ON (e.type);
CREATE INDEX relationship_type_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.type);
CREATE INDEX relationship_from_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.fromId);
CREATE INDEX relationship_to_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.toId);

// Full text index
CALL db.index.fulltext.createNodeIndex('entity_fulltext', ['Entity'], ['value', 'label', 'type']);

// TTL index for relationships using `until`
CALL db.index.expire.createRelationshipIndex('relationship_until_ttl', 'RELATIONSHIP', 'until');
