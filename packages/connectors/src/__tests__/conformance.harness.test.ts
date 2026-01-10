import { describe, expect, it } from 'vitest';

import { ConnectorConformanceHarness, FakeConnector } from '../conformance';

describe('ConnectorConformanceHarness', () => {
  it('produces a clear pass/fail report for a compliant connector', async () => {
    const connector = new FakeConnector();
    const harness = new ConnectorConformanceHarness(connector, {
      pageSize: 2,
      maxRetries: 3,
      rateLimitChecks: 4,
    });

    const report = await harness.run();

    expect(report.connectorName).toBe('fake-connector');
    expect(report.passed).toBe(true);
    expect(report.failures).toHaveLength(0);
    expect(report.results.map((result) => result.name)).toEqual([
      'idempotency',
      'retries',
      'pagination',
      'rate limits',
      'error mapping',
      'evidence completeness',
      'redaction',
    ]);
  });

  it('is easy to extend with custom options', async () => {
    const connector = new FakeConnector();
    const harness = new ConnectorConformanceHarness(connector, { pageSize: 1, rateLimitChecks: 2 });

    const report = await harness.run();

    expect(report.passed).toBe(true);
    expect(report.results.some((result) => result.name === 'pagination')).toBe(true);
  });
});
