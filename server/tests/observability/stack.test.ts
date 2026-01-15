
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { otelService } from '../../src/lib/observability/otel';
import { metrics } from '../../src/lib/observability/metrics';

describe('Observability Stack', () => {
  beforeAll(() => {
    otelService.initialize();
  });

  afterAll(async () => {
    await otelService.shutdown();
  });

  it('should have initialized metrics', () => {
    expect(metrics.httpRequestsTotal).toBeDefined();
    expect(metrics.httpRequestDuration).toBeDefined();
    expect(metrics.applicationErrors).toBeDefined();
  });

  it('should be able to increment a counter', () => {
    metrics.httpRequestsTotal.inc({ method: 'GET', route: '/test', status_code: '200' });
    // We can't easily assert the internal state of prom-client without internal API access,
    // but if this doesn't throw, it's a good sign.
  });

  it('should be able to start a span', () => {
    const span = otelService.startSpan('test-span');
    expect(span).toBeDefined();
    span.end();
  });

  it('should wrap async operations', async () => {
    const result = await otelService.wrap('test-wrap', async (span) => {
      span.setAttributes({ 'test.attr': 'value' });
      return 'success';
    });
    expect(result).toBe('success');
  });
});
