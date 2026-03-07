// Update claim metrics and write provenance step
MATCH (c:EpistemicClaim {claim_id: $claimId})
SET c.support_score = $supportScore,
    c.epistemic_uncertainty = $epistemicUncertainty,
    c.aleatoric_uncertainty = $aleatoricUncertainty,
    c.conflict_score = $conflictScore,
    c.updated_at = datetime()
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
