// Neo4j Indexes for Performance and Uniqueness

// Constraints
CREATE CONSTRAINT user_email_unique IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE;
CREATE CONSTRAINT tenant_id_unique IF NOT EXISTS FOR (t:Tenant) REQUIRE t.id IS UNIQUE;
CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE;

// Indexes for Search Performance
CREATE INDEX entity_name_idx IF NOT EXISTS FOR (e:Entity) ON (e.name);
CREATE INDEX entity_type_idx IF NOT EXISTS FOR (e:Entity) ON (e.type);
CREATE INDEX provenance_actor_idx IF NOT EXISTS FOR (p:ProvenanceEvent) ON (p.actor);

// Fulltext Search
CREATE FULLTEXT INDEX entity_search_idx IF NOT EXISTS FOR (e:Entity) ON EACH [e.name, e.description];
