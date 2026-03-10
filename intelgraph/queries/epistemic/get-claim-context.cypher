// Get the claim and domain
MATCH (d:Domain {id: $subjectRef})
MATCH (c:EpistemicClaim {claim_id: $claimId})-[:ABOUT]->(d)
OPTIONAL MATCH (c)-[s:SUPPORTED_BY]->(e:Evidence)
OPTIONAL MATCH (c)-[:CONFLICTS_WITH]->(c2:EpistemicClaim)
WITH c, collect(e) AS evidence, collect(c2) AS conflicts

// Compute support and conflict in app code
RETURN c, evidence, conflicts;
