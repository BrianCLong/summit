**Intent:** Spot multiple failed logins for same account in short window.
**Cypher (persisted):** MATCH (u:User)-[r:FAILED_LOGIN]->(:Resource) WHERE r.timestamp > $since RETURN u, COUNT(r) AS fails ORDER BY fails DESC LIMIT $limit
