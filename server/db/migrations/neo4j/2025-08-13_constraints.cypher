// Initial Neo4j constraints/indexes
CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (n:Entity) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT relationship_id_unique IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() REQUIRE r.id IS UNIQUE;
CREATE INDEX entity_type_idx IF NOT EXISTS FOR (n:Entity) ON (n.type);
