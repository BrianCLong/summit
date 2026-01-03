import * as client from 'prom-client';
import { randomUUID } from 'crypto';

const HistogramCtor = (client as any).Histogram ??
  class {
    labels() {
      return { observe: () => {} } as any;
    }
  };
const CounterCtor = (client as any).Counter ??
  class {
    inc() {}
    labels() {
      return { inc: () => {} } as any;
    }
  };
const RegistryCtor = (client as any).Registry ?? class {};
const collectDefaultMetrics = (client as any).collectDefaultMetrics ?? (() => {});

export const registry = new RegistryCtor();
collectDefaultMetrics({ register: registry });

export const stageLatency = new HistogramCtor({
  name: 'agentic_rag_stage_latency_ms',
  help: 'Latency per agentic RAG stage',
  labelNames: ['stage'],
  buckets: [5, 10, 20, 50, 100, 250, 500, 1000, 2000],
  registers: [registry],
});

export const cacheHits = new CounterCtor({
  name: 'agentic_rag_cache_hits_total',
  help: 'Cache hits for ragAnswer',
  labelNames: ['status'],
  registers: [registry],
});

export const jobMetrics = {
  queued: new CounterCtor({
    name: 'agentic_rag_jobs_queued_total',
    help: 'Jobs queued',
    registers: [registry],
  }),
  failed: new CounterCtor({
    name: 'agentic_rag_jobs_failed_total',
    help: 'Jobs failed',
    registers: [registry],
  }),
  completed: new CounterCtor({
    name: 'agentic_rag_jobs_completed_total',
    help: 'Jobs completed',
    registers: [registry],
  }),
};

export function withSpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  return fn()
    .then((result) => result)
    .finally(() => {
      const duration = performance.now() - start;
      stageLatency.labels(name).observe(duration);
    });
}

export function newRunId(): string {
  return randomUUID();
}

export function traceId(): string {
  return '';
}

