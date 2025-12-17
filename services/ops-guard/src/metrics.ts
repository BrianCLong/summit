import client from 'prom-client';

export const registry = new client.Registry();

const latencyHeatmap = new client.Histogram({
  name: 'ops_guard_query_latency_ms',
  help: 'Query latency heatmap in milliseconds',
  buckets: [50, 100, 200, 350, 500, 750, 1000, 1250, 1500, 2000, 3000],
  registers: [registry]
});

const saturationGauge = new client.Gauge({
  name: 'ops_guard_saturation_ratio',
  help: 'Ratio of active queries relative to safe concurrency',
  registers: [registry]
});

const activeQueriesGauge = new client.Gauge({
  name: 'ops_guard_active_queries',
  help: 'Number of in-flight queries tracked by Ops Guard',
  registers: [registry]
});

let activeCount = 0;

const costPerInsight = new client.Histogram({
  name: 'ops_guard_cost_per_insight_cents',
  help: 'Histogram of cost-per-insight to highlight expensive workloads',
  buckets: [1, 5, 10, 25, 50, 75, 100, 200],
  registers: [registry]
});

client.collectDefaultMetrics({ register: registry });

export function startQueryTimer(): ReturnType<typeof latencyHeatmap.startTimer> {
  activeQueriesGauge.inc();
  activeCount += 1;
  return latencyHeatmap.startTimer();
}

export function completeQuery(durationMs: number, safeConcurrency = 10): void {
  activeQueriesGauge.dec();
  activeCount = Math.max(0, activeCount - 1);
  latencyHeatmap.observe(durationMs);
  const saturation = safeConcurrency === 0 ? 0 : activeCount / safeConcurrency;
  saturationGauge.set(Math.min(1, saturation));
}

export function trackCostPerInsight(costCents: number, insights: number): void {
  if (insights <= 0) return;
  costPerInsight.observe(costCents / insights);
}

export async function renderMetrics(): Promise<string> {
  return registry.metrics();
}
