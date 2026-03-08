import type { CogBattleStorage } from '../storage';
import type { BeliefClaimLink, NarrativeClaimLink } from '../types';
import { computeBeliefGapMetrics, computeDivergenceMetrics } from './computeMetrics';

export async function computeAndStoreMetrics(
  store: CogBattleStorage,
  data: {
    narrativeClaimLinks: NarrativeClaimLink[];
    beliefClaimLinks: BeliefClaimLink[];
    asOf: string;
    cohortId: string;
  },
): Promise<void> {
  const divergence = computeDivergenceMetrics(data.narrativeClaimLinks, data.asOf);
  const beliefGap = computeBeliefGapMetrics(
    data.beliefClaimLinks,
    data.cohortId,
    data.asOf,
  );

  await store.putMetrics({ divergence, beliefGap });
}
