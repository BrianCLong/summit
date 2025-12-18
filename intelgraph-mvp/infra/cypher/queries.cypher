// Sample Cypher query to find neighbors of an entity
MATCH (e:Entity {id: $id})-[r]-(neighbor)
RETURN neighbor
LIMIT 100;
