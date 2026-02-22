import express from 'express';
import {
  createMetrics,
  createHttpMetricsMiddleware,
  createTraceMiddleware,
  InMemoryIngestStore,
  PolicyEngine,
  denyByDefaultBundle,
} from '@intelgraph/golden-path';

export const app = express();
app.use(express.json());
const metrics = createMetrics();
app.use(createTraceMiddleware());
app.use(createHttpMetricsMiddleware(metrics));
const ingestStore = new InMemoryIngestStore();
const policy = new PolicyEngine(denyByDefaultBundle);

app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
app.get('/readyz', (_req, res) => res.json({ ready: true }));
app.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', metrics.registry.contentType);
  res.send(await metrics.registry.metrics());
});

app.post('/api/ingest', (req, res) => {
  const allowed = policy.evaluate({
    role: 'service',
    resource: 'ingest',
    action: 'write',
    tenant: 'default',
    region: req.body?.entity?.tags?.residencyRegion ?? 'unknown',
    classification: req.body?.entity?.tags?.classification ?? 'public',
  }, res.locals.traceId);
  if (!allowed) {
    return res.status(403).json({ error: 'unauthorized' });
  }
  try {
    ingestStore.ingest(req.body, ['us-east', 'eu-west']);
    return res.status(201).json({ accepted: true });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

app.get('/api/timeline', (req, res) => {
  const items = ingestStore.getTimeline({
    entityId: req.query.entityId as string | undefined,
    source: req.query.source as string | undefined,
    confidenceGte: req.query.confidenceGte
      ? Number(req.query.confidenceGte)
      : undefined,
    start: req.query.start as string | undefined,
    end: req.query.end as string | undefined,
  });
  res.json(items);
});

if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT ?? 8080;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`__SERVICE_NAME__ listening on ${port}`);
  });
}
