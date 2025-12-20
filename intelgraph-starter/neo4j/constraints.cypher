CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT relationship_id_unique IF NOT EXISTS FOR ()-[r:RELATES]->() REQUIRE r.id IS UNIQUE;
CREATE INDEX entity_type_idx IF NOT EXISTS FOR (e:Entity) ON (e.type);
CREATE INDEX relationship_type_idx IF NOT EXISTS FOR ()-[r:RELATES]->() ON (r.type);
