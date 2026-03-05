import { enforceAnalyticOnly } from '../governance/guards';
import type { CogBattleStorage } from '../storage';

export function makeCogBattleApi(store: CogBattleStorage) {
  return {
    async topNarratives(limit = 25) {
      return store.listTopNarratives(limit);
    },
    async beliefs(limit = 25) {
      return store.listBeliefs(limit);
    },
    async divergence(narrativeId?: string) {
      return store.listDivergence(narrativeId);
    },
    async explain(query: string) {
      const guard = enforceAnalyticOnly(query);
      if (!guard.ok) {
        throw new Error(guard.reason);
      }
      return { ok: true, note: 'Explain endpoint stub (analytic only).' };
    },
  };
}

export type CogBattleApi = ReturnType<typeof makeCogBattleApi>;
