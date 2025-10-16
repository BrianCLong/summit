import { Histogram, Gauge, Counter } from 'prom-client';
import { registry } from '../metrics/registry.js';
import type { BudgetSnapshot, CostSnapshot, SLOSnapshot } from './types.js';

class PercentileTracker {
  private samples: number[] = [];
  private readonly maxSamples: number;

  constructor(maxSamples = 500) {
    this.maxSamples = maxSamples;
  }

  record(value: number) {
    if (!Number.isFinite(value)) return;
    this.samples.push(value);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  percentile(p: number): number {
    if (this.samples.length === 0) return 0;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const rank = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    if (lower === upper) {
      return sorted[lower];
    }
    const weight = rank - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
}

const gatewayHistogram = new Histogram({
  name: 'crystal_gateway_latency_ms',
  help: 'Crystal gateway latency observations',
  labelNames: ['operation', 'method'],
  buckets: [50, 100, 200, 350, 500, 700, 900, 1200, 1500],
  registers: [registry],
});

const graphHistogram = new Histogram({
  name: 'crystal_graph_latency_ms',
  help: 'Crystal graph operation latency',
  labelNames: ['hops'],
  buckets: [50, 100, 200, 400, 800, 1200],
  registers: [registry],
});

const costGauge = new Gauge({
  name: 'crystal_budget_spend_usd',
  help: 'Budget spend per environment',
  labelNames: ['environment'],
  registers: [registry],
});

const budgetAlerts = new Counter({
  name: 'crystal_budget_alerts_total',
  help: 'Number of times the cost guardrail threshold was hit',
  labelNames: ['environment'],
  registers: [registry],
});

type EnvironmentKey = 'dev' | 'staging' | 'prod' | 'llm';

const DEFAULT_BUDGETS: Record<EnvironmentKey, number> = {
  dev: 1000,
  staging: 3000,
  prod: 18000,
  llm: 5000,
};

export class SLOMetrics {
  private gatewayRead = new PercentileTracker();
  private gatewayWrite = new PercentileTracker();
  private subscription = new PercentileTracker();
  private graph = new PercentileTracker();
  private budgets: Record<EnvironmentKey, { limit: number; spend: number }>;

  constructor() {
    this.budgets = {
      dev: { limit: DEFAULT_BUDGETS.dev, spend: 0 },
      staging: { limit: DEFAULT_BUDGETS.staging, spend: 0 },
      prod: { limit: DEFAULT_BUDGETS.prod, spend: 0 },
      llm: { limit: DEFAULT_BUDGETS.llm, spend: 0 },
    };
  }

  observeGateway(
    operation: 'read' | 'write' | 'subscription',
    durationMs: number,
  ) {
    gatewayHistogram.observe({ operation, method: operation }, durationMs);
    if (operation === 'read') this.gatewayRead.record(durationMs);
    else if (operation === 'write') this.gatewayWrite.record(durationMs);
    else this.subscription.record(durationMs);
  }

  observeGraph(hops: number, durationMs: number) {
    const hopLabel = hops >= 3 ? '3' : String(hops);
    graphHistogram.observe({ hops: hopLabel }, durationMs);
    this.graph.record(durationMs);
  }

  recordCost(environment: EnvironmentKey, amount: number) {
    const budget = this.budgets[environment];
    budget.spend = Math.max(0, budget.spend + amount);
    costGauge.set({ environment }, budget.spend);
    if (budget.spend >= budget.limit * 0.8) {
      budgetAlerts.inc({ environment });
    }
  }

  getSLOSnapshot(): SLOSnapshot {
    return {
      gatewayReadP95: this.gatewayRead.percentile(95),
      gatewayReadP99: this.gatewayRead.percentile(99),
      gatewayWriteP95: this.gatewayWrite.percentile(95),
      gatewayWriteP99: this.gatewayWrite.percentile(99),
      subscriptionP95: this.subscription.percentile(95),
      graphHopP95: this.graph.percentile(95),
      graphHopP99: this.graph.percentile(99),
    };
  }

  getCostSnapshot(): CostSnapshot {
    const budgets: BudgetSnapshot[] = (
      Object.keys(this.budgets) as EnvironmentKey[]
    ).map((env) => {
      const { limit, spend } = this.budgets[env];
      return {
        environment: env,
        monthlyLimitUsd: limit,
        monthlySpendUsd: spend,
        alertThresholdHit: spend >= limit * 0.8,
      };
    });
    return { budgets };
  }
}

export const sloMetrics = new SLOMetrics();
