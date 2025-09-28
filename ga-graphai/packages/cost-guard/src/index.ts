import { performance } from 'node:perf_hooks';
import type { CostGuardDecision, PlanBudgetInput, SlowQueryRecord, TenantBudgetProfile } from './types.js';

const DEFAULT_PROFILE: TenantBudgetProfile = {
  tenantId: 'global-default',
  maxRru: 150,
  maxLatencyMs: 1500,
  concurrencyLimit: 12
};

export class CostGuard {
  private readonly profile: TenantBudgetProfile;
  private budgetsExceeded = 0;
  private kills = 0;
  private readonly slowQueries = new Map<string, SlowQueryRecord>();

  constructor(profile?: TenantBudgetProfile) {
    this.profile = profile ?? DEFAULT_PROFILE;
  }

  get metrics() {
    return {
      budgetsExceeded: this.budgetsExceeded,
      kills: this.kills,
      activeSlowQueries: this.slowQueries.size
    };
  }

  planBudget(input: PlanBudgetInput): CostGuardDecision {
    const profile = input.profile ?? this.profile;
    const projectedRru = input.plan.estimatedRru;
    const projectedLatency = Math.max(input.plan.estimatedLatencyMs, input.recentLatencyP95);
    const saturation = (input.activeQueries + 1) / profile.concurrencyLimit;

    if (input.plan.containsCartesianProduct || projectedRru > profile.maxRru * 1.6) {
      this.budgetsExceeded += 1;
      return {
        action: 'kill',
        reason: 'Plan exceeds safe limits (cartesian product or excessive RRU).',
        nextCheckMs: 0,
        metrics: { projectedRru, projectedLatencyMs: projectedLatency, saturation }
      };
    }

    if (projectedLatency > profile.maxLatencyMs || saturation > 1 || input.plan.depth > 5) {
      this.budgetsExceeded += 1;
      return {
        action: 'throttle',
        reason: 'Plan approaches tenant guardrails; deferring execution.',
        nextCheckMs: 250,
        metrics: { projectedRru, projectedLatencyMs: projectedLatency, saturation }
      };
    }

    return {
      action: 'allow',
      reason: 'Plan within guardrails.',
      nextCheckMs: 120,
      metrics: { projectedRru, projectedLatencyMs: projectedLatency, saturation }
    };
  }

  killSlowQuery(queryId: string, tenantId: string, reason: string): SlowQueryRecord {
    const record: SlowQueryRecord = {
      queryId,
      tenantId,
      startedAt: performance.now(),
      observedLatencyMs: 0,
      reason
    };
    this.slowQueries.set(queryId, record);
    this.kills += 1;
    return record;
  }

  observeQueryCompletion(queryId: string, latencyMs: number): void {
    const record = this.slowQueries.get(queryId);
    if (record) {
      record.observedLatencyMs = latencyMs;
      this.slowQueries.set(queryId, record);
    }
  }

  release(queryId: string): void {
    this.slowQueries.delete(queryId);
  }
}

export { DEFAULT_PROFILE };
export type { CostGuardDecision, PlanBudgetInput, SlowQueryRecord, TenantBudgetProfile } from './types.js';
