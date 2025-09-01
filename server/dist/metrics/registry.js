import { collectDefaultMetrics, register as defaultRegistry } from 'prom-client';
const g = globalThis;
if (!g.__intelgraph_metrics_inited) {
    // Prefix your metrics to avoid collisions
    collectDefaultMetrics({ register: defaultRegistry, prefix: 'intelgraph_' });
    g.__intelgraph_metrics_inited = true;
}
export const registry = defaultRegistry;
//# sourceMappingURL=registry.js.map