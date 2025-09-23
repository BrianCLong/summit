// Neo4j initialization script for integration tests
// Creates test graph data structure and sample entities

// Create constraints and indexes for test data
CREATE CONSTRAINT test_entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT test_person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT test_org_id IF NOT EXISTS FOR (o:Organization) REQUIRE o.id IS UNIQUE;

// Create indexes for performance
CREATE INDEX test_entity_name IF NOT EXISTS FOR (e:Entity) ON (e.name);
CREATE INDEX test_entity_type IF NOT EXISTS FOR (e:Entity) ON (e.type);

// Sample test entities
CREATE (p1:Person:Entity {
    id: "test-person-1",
    name: "John Doe",
    type: "person",
    metadata: {source: "test", confidence: 1.0}
});

CREATE (p2:Person:Entity {
    id: "test-person-2",
    name: "Jane Smith",
    type: "person",
    metadata: {source: "test", confidence: 0.9}
});

CREATE (o1:Organization:Entity {
    id: "test-org-1",
    name: "Acme Corp",
    type: "organization",
    metadata: {source: "test", industry: "technology"}
});

CREATE (l1:Location:Entity {
    id: "test-location-1",
    name: "New York",
    type: "location",
    metadata: {source: "test", coordinates: [40.7128, -74.0060]}
});

// Sample relationships
MATCH (p1:Person {id: "test-person-1"}), (o1:Organization {id: "test-org-1"})
CREATE (p1)-[:WORKS_FOR {since: "2020-01-01", confidence: 0.95}]->(o1);

MATCH (p2:Person {id: "test-person-2"}), (o1:Organization {id: "test-org-1"})
CREATE (p2)-[:WORKS_FOR {since: "2021-06-15", confidence: 0.90}]->(o1);

MATCH (p1:Person {id: "test-person-1"}), (p2:Person {id: "test-person-2"})
CREATE (p1)-[:KNOWS {relationship: "colleague", confidence: 0.85}]->(p2);

MATCH (o1:Organization {id: "test-org-1"}), (l1:Location {id: "test-location-1"})
CREATE (o1)-[:LOCATED_IN {confidence: 1.0}]->(l1);