import { Counter, Histogram, Gauge } from 'prom-client';
import { registry } from '../../metrics.js';

export const gamIngestLatencyMs = new Histogram({
  name: 'gam_ingest_latency_ms',
  help: 'Latency for GAM memorizer ingest in milliseconds',
  buckets: [10, 25, 50, 100, 250, 500, 1000, 2000],
  registers: [registry],
});

export const gamBuildContextLatencyMs = new Histogram({
  name: 'gam_build_context_latency_ms',
  help: 'Latency for GAM context build in milliseconds',
  buckets: [25, 50, 100, 200, 400, 800, 1600, 3200],
  registers: [registry],
});

export const gamRetrievalHitsTotal = new Counter({
  name: 'gam_retrieval_hits_total',
  help: 'Total retrieval hits by tool',
  labelNames: ['tool'],
  registers: [registry],
});

export const gamPagesUsed = new Gauge({
  name: 'gam_pages_used',
  help: 'Pages referenced during context build',
  registers: [registry],
});

export const gamReflectionSteps = new Gauge({
  name: 'gam_reflection_steps',
  help: 'Number of reflection steps executed',
  registers: [registry],
});

export const gamContextTokensOut = new Gauge({
  name: 'gam_context_tokens_out',
  help: 'Estimated output tokens for briefing',
  registers: [registry],
});
