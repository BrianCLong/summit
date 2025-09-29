// 1-hop
MATCH (n:Entity {id:$id})-[:EMPLOYS|CONTRACTS|PARTNERS_WITH]->(m)
RETURN m.id LIMIT 25;

// 3-hop
MATCH p=(:Entity {id:$id})-[:EMPLOYS|CONTRACTS|PARTNERS_WITH*..3]->(:Entity)
RETURN nodes(p)[-1].id AS dest LIMIT 25;
