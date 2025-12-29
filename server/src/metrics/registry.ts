import { collectDefaultMetrics, Counter, Registry } from 'prom-client';

const g = globalThis as any;
const registry: Registry = g.__intelgraph_registry || new Registry();

if (!g.__intelgraph_metrics_inited) {
  collectDefaultMetrics({ register: registry, prefix: 'intelgraph_' });
  g.__intelgraph_registry = registry;
  g.__intelgraph_metrics_inited = true;
}

const tenantOrUnknown = (tenant?: string) => tenant || 'unknown';

export const requestCounter = new Counter({
  name: 'intelgraph_requests_total',
  help: 'Total API/Webhook requests received',
  labelNames: ['route', 'method', 'status', 'tenant'],
  registers: [registry],
});

export const errorCounter = new Counter({
  name: 'intelgraph_errors_total',
  help: 'Total errors observed across flows',
  labelNames: ['route', 'error_type', 'tenant'],
  registers: [registry],
});

export const incrementRequest = (labels: {
  route: string;
  method: string;
  status: string | number;
  tenant?: string;
}) => {
  requestCounter.inc({
    route: labels.route,
    method: labels.method,
    status: String(labels.status),
    tenant: tenantOrUnknown(labels.tenant),
  });
};

export const incrementError = (labels: {
  route: string;
  error_type: string;
  tenant?: string;
}) => {
  errorCounter.inc({
    route: labels.route,
    error_type: labels.error_type,
    tenant: tenantOrUnknown(labels.tenant),
  });
};

export const getMetricsSnapshot = async () => registry.getMetricsAsJSON();

export const resetRegistryMetrics = () => registry.resetMetrics();

export { registry };
