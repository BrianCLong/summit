**Intent:** Identify network events using uncommon protocols.
**Cypher (persisted):** MATCH (e:Event) WHERE e.protocol IN $protocols AND e.timestamp > $since RETURN e LIMIT $limit
