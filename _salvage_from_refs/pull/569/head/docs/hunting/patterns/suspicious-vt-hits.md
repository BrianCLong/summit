**Intent:** List artifacts with suspicious VirusTotal hits surge.
**Cypher (persisted):** MATCH (f:File) WHERE f.vtHits > $threshold AND f.firstSeen > $since RETURN f LIMIT $limit
