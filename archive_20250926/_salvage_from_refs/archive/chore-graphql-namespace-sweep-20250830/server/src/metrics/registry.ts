import { collectDefaultMetrics, register as defaultRegistry } from 'prom-client';

const g = globalThis as any;
if (!g.__intelgraph_metrics_inited) {
  // Prefix your metrics to avoid collisions
  collectDefaultMetrics({ register: defaultRegistry, prefix: 'intelgraph_' });
  g.__intelgraph_metrics_inited = true;
}

export const registry = defaultRegistry;

