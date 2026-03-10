/**
 * Stock Cypher queries for Epistemology and Phenomenology fabrics.
 */

export const epistemologicalQueries = {
  // Find epistemically safe actions for a given goal
  findEpistemicallySafeActionsForGoal: `
    MATCH (g:Goal {id: $goalId})<-[:FOR_GOAL]-(a:Action)
    MATCH (a)-[:REQUIRES_CLAIM]->(c:Claim)
    WHERE c.confidence >= $minConfidence
      AND c.status = 'ACCEPTED'
      AND NOT (c)<-[:CONTRADICTS]-(:Evidence)
    RETURN a
  `,

  // Get top disputed claims for a specific project
  getTopDisputedClaimsForProject: `
    MATCH (p:Project {id: $projectId})-[:HAS_CLAIM]->(c:Claim)
    WHERE c.status = 'DISPUTED'
    MATCH (c)<-[r:CONTRADICTS]-(e:Evidence)
    RETURN c, count(r) as disputeCount
    ORDER BY disputeCount DESC
    LIMIT 10
  `,

  // Find claims with low evidence count
  findClaimsWithLowEvidence: `
    MATCH (c:Claim)
    OPTIONAL MATCH (c)<-[r:SUPPORTS]-(e:Evidence)
    WITH c, count(r) as evidenceCount
    WHERE evidenceCount < $minEvidenceCount
    RETURN c, evidenceCount
  `,

  // Trace the provenance of a specific claim
  traceClaimProvenance: `
    MATCH path = (c:Claim {id: $claimId})<-[:PRODUCED_BY|UPDATED_BY]-(a:Agent)
    OPTIONAL MATCH (c)<-[:SUPPORTS|CONTRADICTS]-(e:Evidence)
    RETURN path, e
  `
};

export const phenomenologicalQueries = {
  // Find episodes with high friction (confusion or surprise) for a persona
  findHighFrictionEpisodesForPersona: `
    MATCH (p:Perspective {stakeholderClass: $personaId})<-[:HAS_PERSPECTIVE]-(e:Episode)
    MATCH (e)-[:MEDIATED_BY]->(m:Mediation)
    WHERE m.confusionDelta > $highFrictionThreshold
       OR m.surpriseDelta > $highFrictionThreshold
    RETURN e, p, m
  `,

  // Find episodes where trust decreased
  findEpisodesWithTrustDecrease: `
    MATCH (e:Episode)-[:MEDIATED_BY]->(m:Mediation)
    WHERE m.trustDelta < 0
    RETURN e, m
  `,

  // Analyze mediation effectiveness (e.g., cognitive load reduction)
  analyzeMediationEffectiveness: `
    MATCH (m:Mediation {alterationType: 'COGNITIVE_LOAD_REDUCTION'})<-[:MEDIATED_BY]-(e:Episode)
    RETURN e.activityType as Activity, avg(m.confusionDelta) as AvgConfusionDelta, avg(m.trustDelta) as AvgTrustDelta
  `,

  // Find most frequent activities in high-friction episodes
  findMostFrequentActivitiesInHighFrictionEpisodes: `
    MATCH (e:Episode)-[:MEDIATED_BY]->(m:Mediation)
    WHERE m.confusionDelta > $highFrictionThreshold
       OR m.surpriseDelta > $highFrictionThreshold
    RETURN e.activityType, count(e) as count
    ORDER BY count DESC
    LIMIT 10
  `
};
