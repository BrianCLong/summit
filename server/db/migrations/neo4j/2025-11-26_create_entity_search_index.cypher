-- Migration to create a full-text search index for entities
-- 2025-11-26_create_entity_search_index.cypher

CREATE FULLTEXT INDEX entity_search_index FOR (n:Person|Org) ON EACH [n.name, n.email]
