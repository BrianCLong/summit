**Intent:** Detect domains registered within the last hour.
**Cypher (persisted):** MATCH (d:Domain) WHERE d.firstSeen > $since RETURN d LIMIT $limit
