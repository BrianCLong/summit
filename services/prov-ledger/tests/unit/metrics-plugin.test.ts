jest.mock('prom-client', () => {
  const actual = jest.requireActual('prom-client');
  return {
    ...actual,
    collectDefaultMetrics: jest.fn()
  };
});

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { collectDefaultMetrics, register } from 'prom-client';
import metricsPlugin from '../../src/plugins/metrics';

describe('metrics plugin', () => {
  beforeEach(() => {
    register.clear();
  });

  function createStubFastify() {
    const hooks: Record<string, Array<(request: FastifyRequest) => void>> = {};
    const decorated: Record<string, unknown> = {};
    const fastify = {
      log: { warn: jest.fn() },
      decorate: jest.fn((name: string, value: unknown) => {
        decorated[name] = value;
        (fastify as Record<string, unknown>)[name] = value;
      }),
      addHook: jest.fn((name: string, handler: (request: FastifyRequest) => void) => {
        hooks[name] = hooks[name] ?? [];
        hooks[name]!.push(handler);
      }),
      httpErrors: { unauthorized: (message: string) => new Error(message) }
    } as unknown as FastifyInstance & {
      log: { warn: jest.Mock };
    } & Record<string, unknown>;

    return { fastify, hooks, decorated };
  }

  it('logs when disabled and skips registration', async () => {
    const { fastify } = createStubFastify();

    await metricsPlugin(fastify, { enabled: false });

    expect(fastify.log.warn).toHaveBeenCalledWith('Metrics disabled by configuration');
    expect(fastify.decorate).not.toHaveBeenCalled();
  });

  it('collects request metrics when enabled', async () => {
    const { fastify, hooks, decorated } = createStubFastify();

    await metricsPlugin(fastify, { enabled: true });

    expect(fastify.decorate).toHaveBeenCalledWith('metricsRegistry', expect.anything());
    expect(fastify.decorate).toHaveBeenCalledWith('requestCounter', expect.anything());
    expect(fastify.decorate).toHaveBeenCalledWith('latencyHistogram', expect.anything());

    const onRequest = hooks.onRequest?.[0];
    const onResponse = hooks.onResponse?.[0];
    expect(onRequest).toBeDefined();
    expect(onResponse).toBeDefined();

    const request = {
      method: 'GET',
      raw: { statusCode: 200 },
      routeOptions: { url: '/hello' }
    } as unknown as FastifyRequest;

    onRequest?.(request);
    onResponse?.(request);

    const counter = decorated.requestCounter as { get: () => Promise<{ values: Array<{ value: number }> }> };
    const histogram = decorated.latencyHistogram as {
      get: () => Promise<{ values: Array<{ value: number }> }>;
    };
    const registry = decorated.metricsRegistry as { metrics: () => Promise<string> };

    const counterMetric = await counter.get();
    expect(counterMetric.values[0].value).toBe(1);

    const histogramMetric = await histogram.get();
    expect(histogramMetric.values[0].value).toBeGreaterThanOrEqual(0);

    const body = await registry.metrics();
    expect(body).toContain('prov_ledger_requests_total');
    expect(body).toContain('prov_ledger_request_duration_seconds');

    const mockedCollect = collectDefaultMetrics as unknown as jest.Mock;
    expect(mockedCollect).toHaveBeenCalled();
  });

  it('ignores responses without resolved routes', async () => {
    const { fastify, hooks, decorated } = createStubFastify();

    await metricsPlugin(fastify, { enabled: true });

    const onResponse = hooks.onResponse?.[0];
    expect(onResponse).toBeDefined();

    const counterSpy = jest.spyOn(decorated.requestCounter as any, 'inc');
    const histogramSpy = jest.spyOn(decorated.latencyHistogram as any, 'observe');

    const request = {
      method: 'GET',
      raw: {},
      routeOptions: {}
    } as FastifyRequest;

    onResponse?.(request);

    expect(counterSpy).not.toHaveBeenCalled();
    expect(histogramSpy).not.toHaveBeenCalled();

    counterSpy.mockRestore();
    histogramSpy.mockRestore();
  });

  it('records metrics even when start time or status code are missing', async () => {
    const { fastify, hooks, decorated } = createStubFastify();

    await metricsPlugin(fastify, { enabled: true });

    const onResponse = hooks.onResponse?.[0];
    expect(onResponse).toBeDefined();

    const counterSpy = jest.spyOn(decorated.requestCounter as any, 'inc');
    const histogramSpy = jest.spyOn(decorated.latencyHistogram as any, 'observe');

    const request = {
      method: 'POST',
      raw: {},
      routeOptions: { url: '/fallback' }
    } as FastifyRequest;

    onResponse?.(request);

    expect(counterSpy).toHaveBeenCalledWith({ method: 'POST', status_code: '0', route: '/fallback' });
    expect(histogramSpy).toHaveBeenCalled();

    counterSpy.mockRestore();
    histogramSpy.mockRestore();
  });
});
