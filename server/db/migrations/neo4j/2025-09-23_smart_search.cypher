// Optimized fulltext index for entities covering common dynamic properties
CREATE FULLTEXT INDEX entity_smart_search IF NOT EXISTS FOR (n:Entity) ON EACH [n.name, n.title, n.description, n.label, n.text, n.summary, n.content, n.props];
