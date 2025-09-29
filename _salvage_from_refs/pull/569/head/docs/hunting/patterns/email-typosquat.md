**Intent:** Find lookalike domains targeting employees in last 24h.
**Cypher (persisted):** MATCH (d:Domain)-[:RESOLVES_TO]->(i:IP) WHERE d.firstSeen > $since AND d.name =~ $regex RETURN d,i LIMIT $limit
