// Canonical OSINT upsert
MERGE (d:Document {hash: $hash})
SET d.title=$title, d.summary=$summary, d.url=$url, d.publishedAt=$publishedAt,
    d.language=$language, d.license=$license, d.policy=$policy, d.updatedAt=timestamp()
WITH d
UNWIND $entities AS e
  MERGE (x:Entity {id: e.id})
  SET x.kind=e.kind, x.name=e.name
  MERGE (x)-[:MENTIONED_IN]->(d)
WITH d
UNWIND $claims AS c
  MERGE (cl:Claim {id: c.id})
  SET cl.text=c.text, cl.confidence=c.confidence
  MERGE (cl)-[:SUPPORTED_BY]->(d);

