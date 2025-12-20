import { registry } from '../../metrics';
import {
  incrementTenantBudgetHit,
  recordEndpointResult,
  resetReliabilityMetrics,
} from '../reliability-metrics';

const RELIABILITY_METRIC_NAMES = [
  'reliability_request_duration_seconds',
  'reliability_request_latency_quantiles',
  'reliability_request_errors_total',
  'reliability_queue_depth',
  'tenant_query_budget_hits_total',
];

beforeEach(() => {
  resetReliabilityMetrics();
});

afterEach(() => {
  resetReliabilityMetrics();
});

describe('reliability metrics registration', () => {
  it('does not create duplicate collectors on re-import', async () => {
    const metrics = await registry.getMetricsAsJSON();
    const reliabilityMetrics = metrics.filter((metric) =>
      RELIABILITY_METRIC_NAMES.includes(metric.name),
    );
    expect(reliabilityMetrics.length).toBe(RELIABILITY_METRIC_NAMES.length);

    await import('../reliability-metrics');
    const after = await registry.getMetricsAsJSON();
    const reliabilityAfter = after.filter((metric) =>
      RELIABILITY_METRIC_NAMES.includes(metric.name),
    );
    expect(reliabilityAfter.length).toBe(RELIABILITY_METRIC_NAMES.length);
  });

  it('records latency, queue depth, and tenant budgets', async () => {
    recordEndpointResult({
      endpoint: 'graph_query',
      statusCode: 503,
      durationSeconds: 0.25,
      tenantId: 'tenant-123',
      queueDepth: 3,
    });
    incrementTenantBudgetHit('graph_query', 'tenant-123');

    const metrics = await registry.metrics();
    expect(metrics).toContain(
      'reliability_queue_depth{endpoint="graph_query",tenant="tenant-123"} 3',
    );
    expect(metrics).toContain(
      'reliability_request_errors_total{endpoint="graph_query",status="5xx"} 1',
    );
    expect(metrics).toContain(
      'tenant_query_budget_hits_total{tenant="tenant-123",endpoint="graph_query"} 1',
    );
  });
});
