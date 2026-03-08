// Cypher queries for epistemic control
export const GET_CLAIMS_FOR_SUBJECT = `
MATCH (d {id: $subjectRef})
MATCH (c:EpistemicClaim)-[:ABOUT]->(d)
WHERE c.status IN ['hypothesized','corroborated']
RETURN c
ORDER BY c.updated_at DESC;
`;

export const GET_EVIDENCE_FOR_CLAIMS = `
MATCH (c:EpistemicClaim)-[s:SUPPORTED_BY]->(e:Evidence)
OPTIONAL MATCH (e)-[:PRODUCED_BY]->(p:ProvenanceStep)
WHERE c.claim_id IN $claimIds
RETURN c, s, e, p;
`;

export const DETECT_CONFLICTS = `
MATCH (c:EpistemicClaim)-[:ABOUT]->(d {id: $subjectRef})
OPTIONAL MATCH (c)-[conf:CONFLICTS_WITH]->(c2:EpistemicClaim)
RETURN c, collect(c2) AS conflictingClaims;
`;

export const UPDATE_CLAIM_METRICS = `
MATCH (c:EpistemicClaim {claim_id: $claimId})
SET c.confidence = $confidence,
    c.epistemic_uncertainty = $epistemicUncertainty,
    c.aleatoric_uncertainty = $aleatoricUncertainty,
    c.support_score = $supportScore,
    c.conflict_score = $conflictScore,
    c.updated_at = datetime()
RETURN c;
`;

export const LOG_PROVENANCE_STEP = `
MATCH (c:EpistemicClaim {claim_id: $claimId})
CREATE (p:ProvenanceStep {
  step_id: $stepId,
  operation_type: 'EpistemicDecision',
  model_id: 'Maestro-Control-Plane',
  model_version: $cpVersion,
  decision: $decision,
  rationale: $rationale,
  timestamp: datetime()
})
CREATE (p)-[:DERIVES_FROM]->(c)
RETURN p;
`;
