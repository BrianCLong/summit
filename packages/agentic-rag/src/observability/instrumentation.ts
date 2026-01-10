import * as client from 'prom-client';
import { randomUUID } from 'crypto';
import { context, trace, SpanStatusCode } from '@opentelemetry/api';

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
const GaugeCtor = (client as any).Gauge ??
  class {
    inc() {}
    dec() {}
    set() {}
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
  active: new GaugeCtor({
    name: 'agentic_rag_jobs_active',
    help: 'Jobs active',
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
  durationMs: new HistogramCtor({
    name: 'agentic_rag_job_duration_ms',
    help: 'Job duration in milliseconds',
    buckets: [10, 50, 100, 250, 500, 1000, 2000, 5000],
    registers: [registry],
  }),
};

export function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  attributes: Record<string, string | number | boolean> = {}
): Promise<T> {
  const tracer = trace.getTracer('agentic-rag');
  const start = performance.now();
  return tracer.startActiveSpan(name, async (span) => {
    span.setAttributes(attributes);
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      const duration = performance.now() - start;
      stageLatency.labels(name).observe(duration);
      span.end();
    }
  });
}

export function newRunId(): string {
  return randomUUID();
}

export function traceId(): string {
  const span = trace.getSpan(context.active());
  return span?.spanContext().traceId ?? randomUUID();
}

export function logEvent(event: string, data: Record<string, unknown>): void {
  const payload = { event, timestamp: new Date().toISOString(), ...data };
  console.log(JSON.stringify(payload));
}
