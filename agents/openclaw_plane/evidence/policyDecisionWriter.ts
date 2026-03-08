export function createPolicyDecisionPayload(runId: string, seq: number, decision: any) {
  const { nextEvidenceId } = require('./evidenceIds');
  return {
    decisionId: nextEvidenceId(runId, seq),
    runId,
    timestamp: 'fixed-for-determinism',
    decision
  };
}
