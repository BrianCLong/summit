// Node key constraints based on CanonicalEntityType
CREATE CONSTRAINT IF NOT EXISTS node_key_person
FOR (p:PERSON) REQUIRE (p.__pk__) IS UNIQUE;

CREATE CONSTRAINT IF NOT EXISTS node_key_organization
FOR (o:ORGANIZATION) REQUIRE (o.__pk__) IS UNIQUE;

CREATE CONSTRAINT IF NOT EXISTS node_key_case
FOR (c:CASE) REQUIRE (c.__pk__) IS UNIQUE;

CREATE CONSTRAINT IF NOT EXISTS node_key_claim
FOR (c:CLAIM) REQUIRE (c.__pk__) IS UNIQUE;

CREATE CONSTRAINT IF NOT EXISTS node_key_evidence
FOR (e:EVIDENCE) REQUIRE (e.__pk__) IS UNIQUE;

CREATE CONSTRAINT IF NOT EXISTS node_key_narrative
FOR (n:NARRATIVE) REQUIRE (n.__pk__) IS UNIQUE;

// Generalized Relationship Key Constraints (Neo4j 5+ allows constraint on IS UNIQUE for relationships)
CREATE CONSTRAINT IF NOT EXISTS rel_key_supports
FOR ()-[r:SUPPORTS]-() REQUIRE (r.__pk__) IS UNIQUE;

CREATE CONSTRAINT IF NOT EXISTS rel_key_contradicts
FOR ()-[r:CONTRADICTS]-() REQUIRE (r.__pk__) IS UNIQUE;

CREATE CONSTRAINT IF NOT EXISTS rel_key_connected_to
FOR ()-[r:CONNECTED_TO]-() REQUIRE (r.__pk__) IS UNIQUE;
