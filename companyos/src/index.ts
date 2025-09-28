import express from 'express';
import { startPolicyManager } from './policy/index.js';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

const app = express();
const port = Number(process.env.PORT || 3000);
const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'companyos_' });

// GraphQL-like metrics (aligned with dashboards)
const gqlDuration = new Histogram({
  name: 'graphql_request_duration_ms',
  help: 'GraphQL request duration (ms)',
  labelNames: ['service', 'operation'],
  buckets: [25, 50, 100, 200, 350, 500, 700, 1000, 1500],
  registers: [registry],
});
const gqlTotal = new Counter({
  name: 'graphql_requests_total',
  help: 'Total GraphQL requests',
  labelNames: ['service', 'operation'],
  registers: [registry],
});
const gqlErrors = new Counter({
  name: 'graphql_requests_errors_total',
  help: 'Total GraphQL request errors',
  labelNames: ['service', 'operation'],
  registers: [registry],
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/livez', (_req, res) => res.json({ ok: true }));

// Minimal GraphQL endpoint for SLO generation
app.post('/graphql', express.json(), async (req, res) => {
  const service = 'companyos';
  const operation = 'query';
  const start = Date.now();
  try {
    // trivial processing; could branch by req.body.query
    gqlTotal.inc({ service, operation });
    // simulate minor work
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 20)));
    gqlDuration.observe({ service, operation }, Date.now() - start);
    res.json({ data: { __typename: 'Query' } });
  } catch (e) {
    gqlErrors.inc({ service, operation });
    gqlDuration.observe({ service, operation }, Date.now() - start);
    res.status(500).json({ errors: [{ message: (e as Error).message }] });
  }
});

// Prometheus metrics
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

if (process.env.NODE_ENV !== 'test' && process.env.POLICY_AUTO_START !== 'false') {
  try { startPolicyManager(); } catch (e) { console.warn('policy manager start failed', (e as Error).message); }
}

app.listen(port, () => console.log(`[companyos] listening on :${port}`));
