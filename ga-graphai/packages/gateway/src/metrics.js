import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

const latencyHistogram = new Histogram({
  name: 'ai_call_latency_ms',
  help: 'Latency of AI fabric operations in milliseconds.',
  labelNames: ['operation', 'model']
});

const tokenCounter = new Counter({
  name: 'ai_tokens_total',
  help: 'Total tokens processed by operation and direction.',
  labelNames: ['operation', 'direction']
});

const usdGauge = new Gauge({
  name: 'ai_cost_usd_last',
  help: 'USD cost of the most recent call by operation.',
  labelNames: ['operation']
});

const policyDenies = new Counter({
  name: 'ai_policy_denies_total',
  help: 'Policy denials grouped by reason.',
  labelNames: ['reason']
});

registry.registerMetric(latencyHistogram);
registry.registerMetric(tokenCounter);
registry.registerMetric(usdGauge);
registry.registerMetric(policyDenies);

export function observeSuccess(operation, modelId, cost) {
  latencyHistogram.observe({ operation, model: modelId }, cost.latencyMs ?? 0);
  tokenCounter.inc({ operation, direction: 'in' }, cost.tokensIn ?? 0);
  tokenCounter.inc({ operation, direction: 'out' }, cost.tokensOut ?? 0);
  usdGauge.set({ operation }, cost.usd ?? 0);
}

export function observePolicyDeny(reason) {
  policyDenies.inc({ reason });
}
