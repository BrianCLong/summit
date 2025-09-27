// src/server.ts
import express from 'express';
import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';
import { v4 as uuid } from 'uuid';

const app = express();
const registry = new Registry();
collectDefaultMetrics({ register: registry });
const jobsStarted = new Counter({ name: 'maestro_jobs_started_total', help: 'Jobs started' });
const jobsSucceeded = new Counter({ name: 'maestro_jobs_succeeded_total', help: 'Jobs ok' });
const jobsFailed = new Counter({ name: 'maestro_jobs_failed_total', help: 'Jobs failed' });
const jobLatency = new Histogram({ name: 'maestro_job_latency_seconds', help: 'Latency' });
registry.registerMetric(jobsStarted);
registry.registerMetric(jobsSucceeded);
registry.registerMetric(jobLatency);

let ready = false;

app.get('/healthz', (_, res) => res.json({ ok: true }));
app.get('/readyz', async (_, res) => {
  // TODO: ping DB/queue
  return res.status(ready ? 200 : 503).json({ ready });
});
app.get('/metrics', async (_, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

app.post('/run', express.json(), async (req, res) => {
  const key = req.header('Idempotency-Key') || uuid();
  // TODO: check Redis for existing result by key
  jobsStarted.inc();
  const end = jobLatency.startTimer();
  try {
    // enqueue to Kafka with key for partitioned ordering
    // await kafka.produce('maestro.runs', { key, value: JSON.stringify(req.body) });
    end();
    jobsSucceeded.inc();
    res.status(202).json({ runId: key, accepted: true });
  } catch (e) {
    end();
    jobsFailed.inc();
    res.status(500).json({ error: 'enqueue_failed' });
  }
});

export default app;