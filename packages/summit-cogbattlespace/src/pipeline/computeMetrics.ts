import type {
  BeliefClaimLink,
  BeliefGapMetric,
  DivergenceMetric,
  NarrativeClaimLink,
} from '../types';

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function computeDivergenceMetrics(
  links: NarrativeClaimLink[],
  asOf: string,
): DivergenceMetric[] {
  return links.map((link) => ({
    id: id('div'),
    narrativeId: link.narrativeId,
    claimId: link.claimId,
    divergenceScore:
      link.type === 'contradicts' || link.type === 'misrepresents' ? link.score : 0,
    asOf,
  }));
}

export function computeBeliefGapMetrics(
  links: BeliefClaimLink[],
  cohortId: string,
  asOf: string,
): BeliefGapMetric[] {
  return links.map((link) => ({
    id: id('gap'),
    cohortId,
    beliefId: link.beliefId,
    claimId: link.claimId,
    gap: link.gap,
    asOf,
  }));
}
