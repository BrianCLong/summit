import { AsyncLocalStorage } from 'async_hooks';

export interface RlsContext {
  tenantId?: string;
  caseId?: string;
  enabled: boolean;
  path?: string;
  method?: string;
  overheadMs?: number;
}

const rlsStorage = new AsyncLocalStorage<RlsContext>();

export const isRlsFeatureFlagEnabled = (): boolean =>
  process.env.RLS_V1 === '1';

export const runWithRlsContext = <T>(
  context: RlsContext,
  fn: () => T,
): T => rlsStorage.run(context, fn);

export const getRlsContext = (): RlsContext | undefined =>
  rlsStorage.getStore();

export const recordRlsOverhead = (durationMs: number): void => {
  const ctx = rlsStorage.getStore();
  if (!ctx) {return;}

  ctx.overheadMs = (ctx.overheadMs || 0) + durationMs;
};

export const updateCaseContext = (caseId?: string | null): void => {
  const ctx = rlsStorage.getStore();
  if (!ctx || !caseId) {return;}

  ctx.caseId = caseId;
};
