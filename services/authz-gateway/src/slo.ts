import type { Request, Response, NextFunction } from 'express';
import { Summary, Counter, Gauge } from 'prom-client';
import crypto from 'node:crypto';
import { registry } from './observability';

export interface SloSnapshot {
  tenantId: string;
  route: string | 'fleet';
  window: number;
  requestCount: number;
  errorRate: number;
  availability: number;
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  lastUpdated: number;
}

interface Sample {
  durationSeconds: number;
  statusCode: number;
  route: string;
  recordedAt: number;
}

function ensureSummary(
  name: string,
  factory: () => Summary<'tenant' | 'route'>,
): Summary<'tenant' | 'route'> {
  const existing = registry.getSingleMetric(name);
  if (existing) {
    return existing as Summary<'tenant' | 'route'>;
  }
  const metric = factory();
  registry.registerMetric(metric);
  return metric;
}

function ensureCounter(
  name: string,
  factory: () => Counter<'tenant' | 'route' | 'outcome'>,
): Counter<'tenant' | 'route' | 'outcome'> {
  const existing = registry.getSingleMetric(name);
  if (existing) {
    return existing as Counter<'tenant' | 'route' | 'outcome'>;
  }
  const metric = factory();
  registry.registerMetric(metric);
  return metric;
}

function ensureGauge(
  name: string,
  factory: () => Gauge<'tenant' | 'route'>,
): Gauge<'tenant' | 'route'> {
  const existing = registry.getSingleMetric(name);
  if (existing) {
    return existing as Gauge<'tenant' | 'route'>;
  }
  const metric = factory();
  registry.registerMetric(metric);
  return metric;
}

const latencySummary = ensureSummary(
  'authz_gateway_slo_latency_seconds',
  () =>
    new Summary({
      name: 'authz_gateway_slo_latency_seconds',
      help: 'Latency distribution for SLO tracking per tenant and route.',
      percentiles: [0.5, 0.95, 0.99],
      labelNames: ['tenant', 'route'],
      maxAgeSeconds: 300,
      ageBuckets: 5,
    }),
);

const requestsTotal = ensureCounter(
  'authz_gateway_slo_requests_total',
  () =>
    new Counter({
      name: 'authz_gateway_slo_requests_total',
      help: 'Total SLO-scoped requests per tenant and route.',
      labelNames: ['tenant', 'route', 'outcome'],
    }),
);

const errorBudgetGauge = ensureGauge(
  'authz_gateway_error_budget_consumed',
  () =>
    new Gauge({
      name: 'authz_gateway_error_budget_consumed',
      help: 'Estimated error budget consumed (0-1) per tenant for the active window.',
      labelNames: ['tenant', 'route'],
    }),
);

export class SloTracker {
  private readonly samples = new Map<string, Sample[]>();
  constructor(private readonly maxSamples = 1000) {}

  clear() {
    this.samples.clear();
  }

  record(
    tenantId: string,
    route: string,
    durationSeconds: number,
    statusCode: number,
  ): void {
    const key = this.buildKey(tenantId, route);
    const fleetKey = this.buildKey('fleet', route);
    this.appendSample(key, { durationSeconds, statusCode, route, recordedAt: Date.now() });
    this.appendSample(fleetKey, { durationSeconds, statusCode, route, recordedAt: Date.now() });

    const labels = { tenant: tenantId, route } as const;
    const outcome = statusCode >= 500 ? 'error' : 'success';
    latencySummary.observe(labels, durationSeconds);
    requestsTotal.inc({ ...labels, outcome });
    errorBudgetGauge.set(labels, this.estimateErrorBudget(labels));
  }

  snapshot(tenantId: string, route: string | 'fleet' = 'fleet'): SloSnapshot {
    const key = this.buildKey(tenantId, route);
    const entries = [...(this.samples.get(key) || [])];
    if (entries.length === 0) {
      return {
        tenantId,
        route,
        window: this.maxSamples,
        requestCount: 0,
        errorRate: 0,
        availability: 1,
        latency: { p50: 0, p95: 0, p99: 0 },
        lastUpdated: 0,
      };
    }

    const durations = entries.map((entry) => entry.durationSeconds).sort((a, b) => a - b);
    const errors = entries.filter((entry) => entry.statusCode >= 500).length;
    const requestCount = entries.length;
    const errorRate = requestCount === 0 ? 0 : errors / requestCount;
    const availability = 1 - errorRate;

    return {
      tenantId,
      route,
      window: this.maxSamples,
      requestCount,
      errorRate,
      availability,
      latency: {
        p50: this.percentile(durations, 0.5),
        p95: this.percentile(durations, 0.95),
        p99: this.percentile(durations, 0.99),
      },
      lastUpdated: entries[entries.length - 1]?.recordedAt ?? 0,
    };
  }

  private appendSample(key: string, sample: Sample) {
    const list = this.samples.get(key) ?? [];
    list.push(sample);
    if (list.length > this.maxSamples) {
      list.splice(0, list.length - this.maxSamples);
    }
    this.samples.set(key, list);
  }

  private percentile(sorted: number[], q: number): number {
    if (sorted.length === 0) return 0;
    const pos = q * (sorted.length - 1);
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
  }

  private buildKey(tenantId: string, route: string | 'fleet') {
    return `${tenantId}:${route}`;
  }

  private estimateErrorBudget(labels: { tenant: string; route: string }) {
    const snapshot = this.snapshot(labels.tenant, labels.route as 'fleet');
    return Math.min(1, Math.max(0, snapshot.errorRate));
  }
}

export const sloTracker = new SloTracker();

export function resetSloTracker() {
  sloTracker.clear();
}

export function resolveTenantId(
  req: Request & { subjectAttributes?: { tenantId?: string } },
  res: Response,
): string {
  const headerTenant = req.headers['x-tenant-id'];
  const localsTenant = (res.locals?.tenantId as string | undefined) || req.subjectAttributes?.tenantId;
  if (typeof headerTenant === 'string' && headerTenant.trim().length > 0) {
    return headerTenant.trim();
  }
  if (Array.isArray(headerTenant) && headerTenant.length > 0) {
    return headerTenant[0];
  }
  if (localsTenant) {
    return localsTenant;
  }
  return 'unknown';
}

export function sloMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  const route = req.route?.path || req.path || req.originalUrl || 'unknown';

  res.once('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const tenantId = resolveTenantId(req as any, res);
    sloTracker.record(tenantId, route, durationSeconds, res.statusCode);
  });

  res.once('close', () => {
    // treat aborted requests as server error to burn error budget
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const tenantId = resolveTenantId(req as any, res);
    sloTracker.record(tenantId, route, durationSeconds, 499);
  });

  next();
}

export function buildSloEvidence(tenantId: string, route: string | 'fleet' = 'fleet') {
  const snapshot = sloTracker.snapshot(tenantId, route);
  return {
    id: crypto.randomUUID(),
    tenantId,
    route,
    generatedAt: new Date().toISOString(),
    metrics: snapshot,
  };
}
