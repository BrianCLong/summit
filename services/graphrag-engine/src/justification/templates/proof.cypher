MATCH (n:Entity {id: $id})-[r:SUPPORTED_BY]->(m:Entity)
RETURN n, r, m
ORDER BY m.id
LIMIT $max_rows
