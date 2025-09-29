**Intent:** Find hosts beaconing to an IP within 5m windows.
**Cypher (persisted):** MATCH (h:Host)-[r:CONNECTS_TO]->(i:IP) WHERE r.lastSeen > $since RETURN h,i COUNT(r) AS hits ORDER BY hits DESC LIMIT $limit
