// Cypher script to import node embeddings into Neo4j
// This script assumes embeddings.json is available in the Neo4j import directory

// Load embeddings from JSON file using APOC
// Make sure the embeddings.json file is placed in the Neo4j import directory
// and APOC is enabled in your Neo4j configuration (dbms.security.procedures.unrestricted=apoc.*)

CALL apoc.load.json('file:///embeddings.json') YIELD value AS row
UNWIND row AS item
MATCH (n:Entity {id: item.nodeId})
SET n.embedding = item.embedding;
