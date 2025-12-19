// Create fulltext index on Entity nodes for common text properties
// Note: In a real production scenario, you might want to index specific properties.
// Here we index common text fields likely to be searched.
CREATE FULLTEXT INDEX entity_fulltext_idx IF NOT EXISTS
FOR (n:Entity)
ON EACH [n.name, n.description, n.title, n.content, n.text];
