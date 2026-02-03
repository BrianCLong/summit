import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { metrics } from '../metrics/metrics.js';

describe('Observability Metrics', () => {
  it('should increment a counter', async () => {
    expect(() =>
      metrics.incrementCounter('summit_api_requests_total', {
        method: 'GET',
        route: '/health',
        status: '200',
        tenantId: 'test-tenant',
      }),
    ).not.toThrow();
  });

  it('should observe histogram', async () => {
    expect(() =>
      metrics.observeHistogram('summit_api_latency_seconds', 0.5, {
        method: 'GET',
        route: '/health',
      }),
    ).not.toThrow();
  });
});
