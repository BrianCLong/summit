// Comprehensive Neo4j constraints and indexes for IntelGraph
// Run with: cypher-shell -u neo4j -p password -f this_file.cypher

// === CONSTRAINTS ===
// Entity constraints
CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT entity_uuid IF NOT EXISTS FOR (e:Entity) REQUIRE e.uuid IS UNIQUE;

// User constraints  
CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE;

// Investigation constraints
CREATE CONSTRAINT investigation_id IF NOT EXISTS FOR (i:Investigation) REQUIRE i.id IS UNIQUE;

// Relationship constraints
CREATE CONSTRAINT relationship_id IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() REQUIRE r.id IS UNIQUE;

// Analysis constraints
CREATE CONSTRAINT analysis_id IF NOT EXISTS FOR (a:Analysis) REQUIRE a.id IS UNIQUE;

// War Room constraints
CREATE CONSTRAINT warroom_id IF NOT EXISTS FOR (w:WarRoom) REQUIRE w.id IS UNIQUE;

// === INDEXES ===
// Entity indexes
CREATE INDEX entity_type IF NOT EXISTS FOR (e:Entity) ON (e.type);
CREATE INDEX entity_label IF NOT EXISTS FOR (e:Entity) ON (e.label);
CREATE INDEX entity_created IF NOT EXISTS FOR (e:Entity) ON (e.createdAt);
CREATE INDEX entity_source IF NOT EXISTS FOR (e:Entity) ON (e.source);
CREATE INDEX entity_confidence IF NOT EXISTS FOR (e:Entity) ON (e.confidence);

// Investigation indexes
CREATE INDEX investigation_status IF NOT EXISTS FOR (i:Investigation) ON (i.status);
CREATE INDEX investigation_created IF NOT EXISTS FOR (i:Investigation) ON (i.createdAt);
CREATE INDEX investigation_priority IF NOT EXISTS FOR (i:Investigation) ON (i.priority);

// User indexes
CREATE INDEX user_username IF NOT EXISTS FOR (u:User) ON (u.username);
CREATE INDEX user_role IF NOT EXISTS FOR (u:User) ON (u.role);
CREATE INDEX user_created IF NOT EXISTS FOR (u:User) ON (u.createdAt);

// Relationship indexes
CREATE INDEX relationship_type IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.type);
CREATE INDEX relationship_confidence IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.confidence);
CREATE INDEX relationship_created IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.createdAt);

// Analysis indexes
CREATE INDEX analysis_type IF NOT EXISTS FOR (a:Analysis) ON (a.type);
CREATE INDEX analysis_created IF NOT EXISTS FOR (a:Analysis) ON (a.createdAt);
CREATE INDEX analysis_status IF NOT EXISTS FOR (a:Analysis) ON (a.status);

// War Room indexes
CREATE INDEX warroom_status IF NOT EXISTS FOR (w:WarRoom) ON (w.status);
CREATE INDEX warroom_created IF NOT EXISTS FOR (w:WarRoom) ON (w.createdAt);

// === FULL-TEXT SEARCH INDEXES ===
CREATE FULLTEXT INDEX entity_search IF NOT EXISTS FOR (e:Entity) ON EACH [e.label, e.description, e.properties];
CREATE FULLTEXT INDEX investigation_search IF NOT EXISTS FOR (i:Investigation) ON EACH [i.title, i.description, i.notes];
CREATE FULLTEXT INDEX user_search IF NOT EXISTS FOR (u:User) ON EACH [u.username, u.firstName, u.lastName, u.email];

// === COMPOSITE INDEXES FOR PERFORMANCE ===
CREATE INDEX entity_type_created IF NOT EXISTS FOR (e:Entity) ON (e.type, e.createdAt);
CREATE INDEX investigation_status_created IF NOT EXISTS FOR (i:Investigation) ON (i.status, i.createdAt);
CREATE INDEX relationship_type_confidence IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.type, r.confidence);
