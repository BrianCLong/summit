import { listRecentSignals, upsertTrustScore } from '../db/repositories/trustRiskRepo.js';
import { recordTrustScore } from '../observability/trust-risk-metrics.js';

export type Signal = { severity: string; created_at: string };

export function computeTrustScore(base: number, signals: Signal[]): number {
  // Simple heuristic: subtract severity weights for signals in last 7 days
  const now = Date.now();
  const weekMs = 7 * 24 * 3600 * 1000;
  const weight = (sev: string) => ({ LOW: 0.01, MEDIUM: 0.03, HIGH: 0.08, CRITICAL: 0.15 }[sev as any] || 0.02);
  let score = base;
  for (const s of signals) {
    const age = now - new Date(s.created_at).getTime();
    if (age <= weekMs) score -= weight(String(s.severity).toUpperCase());
  }
  return Math.min(1, Math.max(0, parseFloat(score.toFixed(4))));
}

export async function recomputeTrustForTenant(tenantId: string, subjectId: string) {
  const recents = await listRecentSignals(tenantId, subjectId, 100);
  const score = computeTrustScore(0.7, recents);
  await upsertTrustScore(tenantId, subjectId, score, ['auto_recompute']);
  recordTrustScore(subjectId, score);
}

