import path from 'node:path';
import { createTenantFixtures } from './tenantIsolation.fixtures';
import {
  MockProbeClient,
  TenantIsolationHarness,
  loadProbeConfig,
} from './tenantIsolationHarness';

describe('Multi-tenant isolation regression suite', () => {
  const fixtures = createTenantFixtures();
  const probes = loadProbeConfig(path.resolve(process.cwd(), 'tests/tenant/probes.yaml'));
  const harness = new TenantIsolationHarness({
    probes,
    fixtures,
    client: new MockProbeClient(fixtures),
    parallelism: 3,
  });

  it('blocks cross-tenant data leakage across configured endpoints', async () => {
    expect(probes.length).toBeGreaterThanOrEqual(6);

    const results = await harness.runSuite();
    const leaks = results.flatMap((result) => result.leaks);

    if (leaks.length) {
      const message = harness.formatLeakReport(leaks);
      throw new Error(message);
    }

    expect(results.length).toBe(probes.length * fixtures.length);

    results.forEach((result) => {
      expect(result.records.length).toBeGreaterThan(0);
      result.records.forEach((record) => {
        const tenant = record.tenantId ?? record.scope?.tenant;
        expect(tenant).toBe(result.tenantId);
      });
    });
  });
});
