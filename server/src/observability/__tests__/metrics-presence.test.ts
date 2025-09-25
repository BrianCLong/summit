import { registry } from '../../metrics';

describe('observability metrics registration', () => {
  it('registers latency and policy metrics for SLO dashboards', async () => {
    const metricNames = (await registry.getMetricsAsJSON()).map((metric) => metric.name);

    expect(metricNames).toEqual(
      expect.arrayContaining([
        'graph_query_latency_seconds',
        'ingest_pipeline_e2e_seconds',
        'ingest_signal_lag_seconds',
        'policy_decisions_total',
        'slo_error_budget_burn_rate',
      ]),
    );
  });
});
