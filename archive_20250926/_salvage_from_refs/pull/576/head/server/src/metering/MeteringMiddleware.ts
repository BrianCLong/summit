import { Counter, Histogram } from 'prom-client';
import { createHash } from 'crypto';

const apiCount = new Counter({
  name: 'ig_api_calls_total',
  help: 'API calls',
  labelNames: ['tenant', 'route', 'status'],
});

const computeSec = new Histogram({
  name: 'ig_compute_seconds',
  help: 'Compute time',
  labelNames: ['tenant', 'service'],
});

export function metering(tenantId: string, route: string) {
  const start = process.hrtime.bigint();
  return (status = '200', service = 'graphql') => {
    const t = createHash('sha256').update(tenantId).digest('hex');
    apiCount.inc({ tenant: t, route, status });
    const dur = Number(process.hrtime.bigint() - start) / 1e9;
    computeSec.observe({ tenant: t, service }, dur);
  };
}
