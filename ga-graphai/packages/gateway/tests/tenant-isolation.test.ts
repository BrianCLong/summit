import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  CircuitBreaker,
  TenantRateLimiter,
  enforceRowLevelSecurity,
  evaluatePerformance,
  guardTenantRequest,
  tenantMiddleware,
} from '../src/index.js';

describe('tenant isolation middleware', () => {
  it('blocks requests without tenant and enforces rate limits', async () => {
    const app = express();
    const limiter = new TenantRateLimiter(1, 0); // single token, no refill
    app.use(tenantMiddleware);
    app.use(guardTenantRequest(limiter));
    app.get('/resource', (req, res) => res.json({ tenant: (req as any).tenantId }));

    const missingTenant = await request(app).get('/resource');
    expect(missingTenant.status).toBe(401);

    const first = await request(app).get('/resource').set('x-tenant-id', 't1');
    expect(first.status).toBe(200);
    const second = await request(app).get('/resource').set('x-tenant-id', 't1');
    expect(second.status).toBe(429);
  });

  it('filters rows by tenant id to enforce row-level security', () => {
    const rows = [
      { id: 1, tenantId: 'a' },
      { id: 2, tenantId: 'b' },
      { id: 3, tenantId: 'a' },
    ];
    const scoped = enforceRowLevelSecurity('a', rows);
    expect(scoped).toHaveLength(2);
    expect(scoped.every((row) => row.tenantId === 'a')).toBe(true);
  });
});

describe('circuit breaker and perf gate', () => {
  it('opens after failures then resets', async () => {
    const breaker = new CircuitBreaker(2, 50);
    breaker.recordFailure();
    expect(breaker.canPass()).toBe(true);
    breaker.recordFailure();
    expect(breaker.canPass()).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(breaker.canPass()).toBe(true);
  });

  it('detects regression beyond threshold', () => {
    const baseline = { p50: 100, p95: 200, p99: 400, throughput: 500, errorRate: 0.01 };
    const latest = { ...baseline, p95: 250, throughput: 430 };
    const result = evaluatePerformance(baseline, latest);
    expect(result.passed).toBe(false);
    expect(result.regressions).toContain('p95 regressed');
  });
});
