import { SelfEditRegistry } from '@ga-graphai/prov-ledger';
import type { SelfEditRecord, SelfEditScorecard } from 'common-types';

export interface SelfEditEvaluationPlanItem {
  record: SelfEditRecord;
  scorecard: SelfEditScorecard;
  priority: number;
  domain: string;
}

export interface SelfEditEvaluationPlanOptions {
  maxPerDomain?: number;
  thresholdOverride?: number;
  minVerifierCountOverride?: number;
  includeRejected?: boolean;
  now?: Date;
}

const STATUS_WEIGHTS: Record<string, number> = {
  proposed: 60,
  queued: 80,
  approved: 120,
  rejected: -200,
  applied: -400,
  expired: -300,
};

export function buildSelfEditEvaluationPlan(
  registry: SelfEditRegistry,
  options: SelfEditEvaluationPlanOptions = {},
): SelfEditEvaluationPlanItem[] {
  const maxPerDomain = options.maxPerDomain ?? 3;
  const includeRejected = options.includeRejected ?? false;
  const threshold = options.thresholdOverride;
  const minVerifierCount = options.minVerifierCountOverride;
  const now = options.now ?? new Date();

  const candidates = registry
    .list()
    .filter((record) => {
      if (!includeRejected && record.status === 'rejected') {
        return false;
      }
      if (record.status === 'applied' || record.status === 'expired') {
        return false;
      }
      return true;
    })
    .map((record) => {
      const scorecard = registry.getScorecard(record.id, {
        threshold,
        minVerifierCount,
      });
      const domain = record.domain ?? 'general';
      const priority = computePriority(record, scorecard, now);
      return { record, scorecard, domain, priority };
    });

  candidates.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    const avgA = a.scorecard.averageScore ?? 0;
    const avgB = b.scorecard.averageScore ?? 0;
    if (avgB !== avgA) {
      return avgB - avgA;
    }
    return Date.parse(b.record.updatedAt) - Date.parse(a.record.updatedAt);
  });

  const selections: SelfEditEvaluationPlanItem[] = [];
  const perDomainCounts = new Map<string, number>();

  for (const candidate of candidates) {
    const count = perDomainCounts.get(candidate.domain) ?? 0;
    if (maxPerDomain >= 0 && count >= maxPerDomain) {
      continue;
    }
    perDomainCounts.set(candidate.domain, count + 1);
    selections.push(candidate);
  }

  return selections;
}

function computePriority(
  record: SelfEditRecord,
  scorecard: SelfEditScorecard,
  now: Date,
): number {
  const statusWeight = STATUS_WEIGHTS[record.status] ?? 0;
  const readyBoost = scorecard.ready ? 150 : 0;
  const reviewBoost = record.approval ? 40 : 0;
  const freshnessMinutes = Math.max(
    0,
    (now.getTime() - Date.parse(record.updatedAt)) / 60000,
  );
  const freshnessPenalty = Math.min(100, freshnessMinutes);
  const averageScore = scorecard.averageScore ?? 0;

  return (
    statusWeight +
    readyBoost +
    reviewBoost +
    averageScore * 100 -
    freshnessPenalty
  );
}
