import { apolloPromPlugin } from '../apolloPromPlugin.js';
import { registry } from '../registry.js';

describe('apolloPromPlugin cache metrics', () => {
  beforeEach(() => {
    registry.resetMetrics();
  });

  it('records cache events and hit ratios from context metrics', async () => {
    const plugin = apolloPromPlugin();
    const headers = new Map<string, string>();
    headers.set('x-tenant-id', 'tenantA');

    const requestContext: any = {
      contextValue: {
        tenant: 'tenantA',
        __cacheMetrics: {
          events: [
            { op: 'tenantCoherence', status: 'hit', store: 'redis', tenant: 'tenantA' },
            { op: 'tenantCoherence', status: 'miss', store: 'redis', tenant: 'tenantA' },
            { op: 'tenantCoherence', status: 'hit', store: 'memory', tenant: 'tenantA' },
          ],
        },
      },
      operationName: 'TenantCacheProbe',
      operation: { operation: 'query' },
      request: {
        operationName: 'TenantCacheProbe',
        http: { headers },
      },
    };

    const hooks = await plugin.requestDidStart?.(requestContext);
    await hooks?.willSendResponse?.({
      ...requestContext,
      response: {
        http: { headers: new Map() },
        body: { kind: 'single', singleResult: {} },
      },
      errors: [],
    } as any);

    const eventsMetric = await registry.getSingleMetricAsString('apollo_cache_events_total');
    expect(eventsMetric).toContain('operation="tenantCoherence"');
    expect(eventsMetric).toContain('status="hit"');
    expect(eventsMetric).toContain('status="miss"');

    const ratioMetric = await registry.getSingleMetricAsString('apollo_cache_hit_ratio');
    expect(ratioMetric).toContain('tenantCoherence');
    expect(ratioMetric).toContain('0.666');
  });
});
