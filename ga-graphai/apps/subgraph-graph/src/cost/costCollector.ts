import type { ResultSummary, PlanDescription } from 'neo4j-driver';

export interface CostOperationRecord {
  operation: string;
  source: 'database' | 'cache';
  metrics: {
    resultAvailableAfterMs?: number;
    resultConsumedAfterMs?: number;
  };
  counters?: Record<string, number>;
  plan?: PlanSummary;
  meta?: Record<string, unknown>;
}

export interface PlanSummary {
  operatorType: string;
  dbHits?: number;
  pageCacheHits?: number;
  pageCacheMisses?: number;
  children?: PlanSummary[];
}

export class CostCollector {
  private readonly operations: CostOperationRecord[] = [];

  recordDatabase(operation: string, summary: ResultSummary, meta: Record<string, unknown> = {}): void {
    this.operations.push({
      operation,
      source: 'database',
      metrics: {
        resultAvailableAfterMs: toNumber(summary.resultAvailableAfter),
        resultConsumedAfterMs: toNumber(summary.resultConsumedAfter)
      },
      counters: extractCounters(summary),
      plan: extractPlan(summary.profile ?? summary.plan ?? undefined),
      meta
    });
  }

  recordCache(operation: string, meta: Record<string, unknown> = {}): void {
    this.operations.push({
      operation,
      source: 'cache',
      metrics: {},
      meta
    });
  }

  export(): { operations: CostOperationRecord[] } | null {
    if (!this.operations.length) {
      return null;
    }
    return { operations: this.operations };
  }
}

function extractCounters(summary: ResultSummary): Record<string, number> {
  const counters: Record<string, number> = {};
  const c = summary.counters as Record<string, unknown>;
  for (const key of Object.keys(c ?? {})) {
    const value = (c as Record<string, unknown>)[key];
    if (typeof value === 'number') {
      counters[key] = value;
    }
  }
  if (typeof summary.counters?.containsUpdates === 'function') {
    counters.containsUpdates = summary.counters.containsUpdates() ? 1 : 0;
  }
  return counters;
}

function extractPlan(plan?: PlanDescription | null): PlanSummary | undefined {
  if (!plan) {
    return undefined;
  }
  return {
    operatorType: plan.operatorType,
    dbHits: toNumber(plan.dbHits),
    pageCacheHits: toNumber(plan.pageCacheHits),
    pageCacheMisses: toNumber(plan.pageCacheMisses),
    children: plan.children?.map(extractPlan)
  };
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return value;
  }
  if (value && typeof (value as { toNumber: () => number }).toNumber === 'function') {
    try {
      return (value as { toNumber: () => number }).toNumber();
    } catch (error) {
      return Number.parseFloat(String(value));
    }
  }
  return undefined;
}
