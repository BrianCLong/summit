import { jest, beforeAll, beforeEach, describe, it, expect } from '@jest/globals';
import type { QuotaEnforcer as QuotaEnforcerType } from '../QuotaEnforcer.js';

// Mock dependencies
jest.unstable_mockModule(
  new URL('../../../services/RateLimiter.ts', import.meta.url).pathname,
  () => ({
    rateLimiter: {
      checkLimit: jest.fn(),
    },
  }),
);

jest.unstable_mockModule(
  new URL('../QuotaConfig.ts', import.meta.url).pathname,
  () => ({
    quotaConfigService: {
        getTenantPlan: jest.fn(),
        getTenantOverrides: jest.fn(),
        getFeatureAllowlist: jest.fn(),
    },
    DEFAULT_PLANS: {
        starter: { api_rpm: 100, ingest_eps: 10, egress_gb_day: 1 },
        standard: { api_rpm: 6000, ingest_eps: 1000, egress_gb_day: 50 },
    }
}));

// Mock PrometheusMetrics
jest.unstable_mockModule(
  new URL('../../../utils/metrics.ts', import.meta.url).pathname,
  () => ({
    PrometheusMetrics: jest.fn().mockImplementation(() => ({
      createCounter: jest.fn(),
      incrementCounter: jest.fn(),
      createGauge: jest.fn(),
      setGauge: jest.fn(),
    })),
  }),
);


let QuotaEnforcer: typeof QuotaEnforcerType;
let rateLimiter: { checkLimit: jest.Mock };
let quotaConfigService: {
  getTenantPlan: jest.Mock;
  getTenantOverrides: jest.Mock;
  getFeatureAllowlist: jest.Mock;
};

describe('QuotaEnforcer', () => {
  let enforcer: QuotaEnforcerType;

  beforeAll(async () => {
    ({ QuotaEnforcer } = await import('../QuotaEnforcer.js'));
    ({ rateLimiter } = await import('../../../services/RateLimiter.js'));
    ({ quotaConfigService } = await import('../QuotaConfig.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    enforcer = QuotaEnforcer.getInstance();
    (quotaConfigService.getTenantPlan as jest.Mock).mockReturnValue('starter');
    (quotaConfigService.getTenantOverrides as jest.Mock).mockReturnValue({});
    (quotaConfigService.getFeatureAllowlist as jest.Mock).mockReturnValue(['allowed-tenant']);
  });

  it('should enforce API quota', async () => {
    (rateLimiter.checkLimit as jest.Mock).mockImplementation(async () => ({
      allowed: true,
      total: 100,
      remaining: 99,
      reset: 12345,
    }));

    const result = await enforcer.checkApiQuota('demo-tenant');
    expect(result.allowed).toBe(true);
    expect(rateLimiter.checkLimit).toHaveBeenCalledWith(
      'quota:demo-tenant:api_rpm',
      100, // Starter plan limit
      60000,
    );
  });

  it('should enforce Ingest quota with custom amount', async () => {
    (rateLimiter.checkLimit as jest.Mock).mockImplementation(async () => ({
      allowed: false,
      total: 10,
      remaining: 0,
      reset: 12345,
    }));

    const result = await enforcer.checkIngestQuota('demo-tenant', 5);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('INGEST_EPS_EXCEEDED');
    expect(rateLimiter.checkLimit).toHaveBeenCalledWith(
      'quota:demo-tenant:ingest_eps',
      10, // Starter plan limit
      1000,
      5
    );
  });

  it('should respect tenant overrides', async () => {
     (quotaConfigService.getTenantPlan as jest.Mock).mockReturnValue('standard');
     (quotaConfigService.getTenantOverrides as jest.Mock).mockReturnValue({ api_rpm: 8000 });

     (rateLimiter.checkLimit as jest.Mock).mockImplementation(async () => ({
      allowed: true,
      total: 8000,
      remaining: 7999,
      reset: 12345,
    }));

    await enforcer.checkApiQuota('acme-corp');
    expect(rateLimiter.checkLimit).toHaveBeenCalledWith(
      'quota:acme-corp:api_rpm',
      8000, // Overridden limit
      60000,
    );
  });

  it('should check feature allowlist', () => {
      expect(enforcer.isFeatureAllowed('allowed-tenant', 'write_aware_sharding')).toBe(true);
      expect(enforcer.isFeatureAllowed('blocked-tenant', 'write_aware_sharding')).toBe(false);
  });
});
