// deterministic seed labels/rels for IntelGraph Grounding Bench
CREATE INDEX node_id IF NOT EXISTS FOR (n:IntelEntity) ON (n.id);

UNWIND range(1,1000) AS i
CREATE (n:IntelEntity {
    id: i,
    kind: CASE WHEN i%5=0 THEN 'Person' ELSE 'Thing' END,
    name: 'E'+toString(i),
    tag: i%10
});

// Deterministic edges using modulo instead of rand()
UNWIND range(1,1200) AS i
MATCH (a:IntelEntity {id: (i * 31) % 1000 + 1}), (b:IntelEntity {id: (i * 37) % 1000 + 1})
WHERE a<>b
MERGE (a)-[:RELATED {w: (i * 17) % 100}]->(b);
