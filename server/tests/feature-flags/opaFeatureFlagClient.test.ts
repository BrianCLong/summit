import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import nock from 'nock';
import { register } from 'prom-client';
jest.mock('../../src/feature-flags/metrics.js', () => ({
  __esModule: true,
  ensureMetricsRegistered: jest.fn(),
  featureFlagLatency: {
    labels: () => ({ observe: () => {} }),
  },
  featureFlagDecisions: {
    labels: () => ({ inc: () => {} }),
  },
  killSwitchGauge: {
    labels: () => ({ set: () => {} }),
  },
}));

let OPAFeatureFlagClient: typeof import('../../src/feature-flags/opaFeatureFlagClient.js').OPAFeatureFlagClient;

const OPA_URL = 'http://localhost:8888';

describe('OPAFeatureFlagClient', () => {
  let client: InstanceType<typeof OPAFeatureFlagClient>;

  beforeAll(() => {
    nock.disableNetConnect();
  });

  beforeEach(async () => {
    process.env.OPA_URL = OPA_URL;
    process.env.FEATURE_FLAG_FAIL_OPEN = 'false';
    register.clear();
    if (!OPAFeatureFlagClient) {
      ({ OPAFeatureFlagClient } = await import('../../src/feature-flags/opaFeatureFlagClient.js'));
    }
    client = new OPAFeatureFlagClient();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  it('returns OPA decision and audit metadata', async () => {
    nock(OPA_URL)
      .post('/v1/data/feature_flags/decision')
      .reply(200, {
        result: {
          enabled: true,
          reason: 'allowed',
          kill_switch_active: false,
          audit: { trace_id: 'trace-1' },
        },
      });

    const { decision } = await client.evaluateFlag('beta-mode', {
      userId: 'user-1',
      tenantId: 'tenant-1',
    });

    expect(decision.enabled).toBe(true);
    expect(decision.reason).toBe('allowed');
    expect(decision.killSwitchActive).toBe(false);
    expect(decision.audit?.trace_id).toBe('trace-1');
  });

  it('evaluates module kill switches', async () => {
    nock(OPA_URL)
      .post('/v1/data/feature_flags/kill_switch')
      .reply(200, {
        result: {
          active: true,
          reason: 'ops-toggle',
          audit: { module: 'search' },
        },
      });

    const { decision } = await client.isKillSwitchActive('search', {
      module: 'search',
    });

    expect(decision.active).toBe(true);
    expect(decision.reason).toBe('ops-toggle');
    expect(decision.audit?.module).toBe('search');
  });

  it('fails closed when OPA is unavailable and failOpen is false', async () => {
    nock(OPA_URL)
      .post('/v1/data/feature_flags/decision')
      .replyWithError('opa-offline');

    process.env.FEATURE_FLAG_FAIL_OPEN = 'false';
    const strictClient = new OPAFeatureFlagClient();
    const { decision } = await strictClient.evaluateFlag('beta-mode');

    expect(decision.enabled).toBe(false);
    expect(decision.reason).toBe('opa-error');
  });
});
