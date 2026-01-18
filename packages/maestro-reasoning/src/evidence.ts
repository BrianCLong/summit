import type { EvidenceArtifact, EvidenceScoringWeights } from './types.js';

export const defaultEvidenceWeights: EvidenceScoringWeights = {
  base: 1,
  executionLog: 3,
  testResult: 5,
  policyEvaluation: 4,
  counterexample: 4,
  provenance: 2,
  trace: 1,
  note: 0.5,
};

export const evidenceScore = (
  artifacts: EvidenceArtifact[],
  weights: EvidenceScoringWeights = defaultEvidenceWeights,
): number => {
  return artifacts.reduce((score, artifact) => {
    switch (artifact.kind) {
      case 'execution-log':
        return score + weights.executionLog;
      case 'test-result':
        return score + weights.testResult;
      case 'policy-evaluation':
        return score + weights.policyEvaluation;
      case 'counterexample':
        return score + weights.counterexample;
      case 'provenance':
        return score + weights.provenance;
      case 'trace':
        return score + weights.trace;
      case 'note':
        return score + weights.note;
      default:
        return score;
    }
  }, weights.base);
};
