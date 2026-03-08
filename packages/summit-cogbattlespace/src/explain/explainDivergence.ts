import type { DivergenceMetric, Narrative, RealityClaim } from '../types';

export type DivergenceExplanation = {
  narrativeId: string;
  claimId: string;
  divergenceScore: number;
  summary: string;
  disclaimers: string[];
};

export function explainDivergence(input: {
  narrative: Narrative;
  metric: DivergenceMetric;
  claim?: RealityClaim;
}): DivergenceExplanation {
  const claimText = input.claim?.statement ?? '(claim text unavailable in this view)';
  return {
    narrativeId: input.narrative.id,
    claimId: input.metric.claimId,
    divergenceScore: input.metric.divergenceScore,
    summary:
      'This narrative appears to conflict with an evidence-backed claim.\n\n' +
      `Narrative: ${input.narrative.label}\n` +
      `Claim: ${claimText}\n` +
      `Score: ${input.metric.divergenceScore.toFixed(2)} (observational signal; review required).`,
    disclaimers: [
      'Analytic/defensive only: this does not prescribe counter-messaging.',
      'Scores are heuristics; corroborate with evidence and domain review.',
      'Association is not causation.',
    ],
  };
}
