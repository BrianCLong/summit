export interface ClaimRecord {
  claim_id: string;
  statement: string;
  source_id: string;
}

export interface DecisionRecord {
  decision_id: string;
  claim_id: string;
  policy_id: string;
  decision: string;
  evidence_ids: string[];
}

export async function getClaimContext(neo4jSession: any, claimId: string): Promise<any> {
  // Skeleton method for fetching claim context from IntelGraph
  const query = `
    MATCH (c:Claim {id: $claimId})
    OPTIONAL MATCH (c)-[:HAS_EVIDENCE]->(e:Evidence)
    RETURN c, collect(e.id) as evidenceIds
  `;
  const result = await neo4jSession.run(query, { claimId });
  return result.records;
}

export async function writeDecisionProvenance(neo4jSession: any, decision: DecisionRecord): Promise<void> {
  // Skeleton method for writing the epistemic decision back to IntelGraph
  const query = `
    MATCH (c:Claim {id: $claimId})
    CREATE (d:EpistemicDecision {
      id: $decisionId,
      policyId: $policyId,
      decision: $decision,
      evidenceIds: $evidenceIds,
      timestamp: timestamp()
    })
    CREATE (c)-[:HAS_DECISION]->(d)
  `;
  await neo4jSession.run(query, {
    claimId: decision.claim_id,
    decisionId: decision.decision_id,
    policyId: decision.policy_id,
    decision: decision.decision,
    evidenceIds: decision.evidence_ids
  });
}
