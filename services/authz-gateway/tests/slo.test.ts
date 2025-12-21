import express from 'express';
import request from 'supertest';
import { sloTracker, resetSloTracker, sloMiddleware } from '../src/slo';

describe('SLO tracker', () => {
  beforeEach(() => {
    resetSloTracker();
  });

  it('computes percentiles and error rate per tenant', () => {
    sloTracker.record('tenant-a', '/route', 0.05, 200);
    sloTracker.record('tenant-a', '/route', 0.5, 503);
    sloTracker.record('tenant-a', '/route', 0.2, 200);

    const snapshot = sloTracker.snapshot('tenant-a', '/route');
    expect(snapshot.requestCount).toBe(3);
    expect(snapshot.errorRate).toBeCloseTo(1 / 3);
    expect(snapshot.latency.p50).toBeGreaterThan(0.05);
    expect(snapshot.latency.p95).toBeGreaterThanOrEqual(snapshot.latency.p50);
    expect(snapshot.availability).toBeCloseTo(2 / 3);
  });

  it('tracks fleet aggregates separately from tenants', () => {
    sloTracker.record('tenant-a', '/fleet-route', 0.1, 200);
    sloTracker.record('tenant-b', '/fleet-route', 0.2, 200);

    const fleetSnapshot = sloTracker.snapshot('fleet', '/fleet-route');
    expect(fleetSnapshot.requestCount).toBe(2);
    expect(fleetSnapshot.errorRate).toBe(0);
  });

  it('captures middleware measurements for authorized routes', async () => {
    const app = express();
    app.use(sloMiddleware);
    app.get('/demo', (_req, res) => res.status(200).json({ ok: true }));

    await request(app).get('/demo').set('x-tenant-id', 'tenant-42');

    const snapshot = sloTracker.snapshot('tenant-42', '/demo');
    expect(snapshot.requestCount).toBeGreaterThanOrEqual(1);
    expect(snapshot.latency.p50).toBeGreaterThan(0);
  });
});
