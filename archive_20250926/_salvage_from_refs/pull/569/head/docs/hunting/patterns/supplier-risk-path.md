**Intent:** Reveal supplier relationships touching high-risk vendors.
**Cypher (persisted):** MATCH p=(:Company {name:$vendor})-[:SUPPLIES_TO*1..3]->(:Company) RETURN p LIMIT $limit
