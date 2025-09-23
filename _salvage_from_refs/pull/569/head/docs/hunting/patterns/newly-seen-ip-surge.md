**Intent:** Highlight surge in newly seen IP addresses.
**Cypher (persisted):** MATCH (i:IP) WHERE i.firstSeen > $since RETURN i LIMIT $limit
