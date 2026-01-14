import { describe, it, expect, jest } from '@jest/globals';
import { TenantIsolationGuard, RateLimiterLike } from '../TenantIsolationGuard.js';
import { TenantKillSwitch } from '../killSwitch.js';
import { TenantContext } from '../types.js';

// Mock Dependencies
const mockKillSwitch = {
  isDisabled: jest.fn<any>(),
  hasConfig: jest.fn<any>(),
};

const mockRateLimiter: RateLimiterLike = {
  checkLimit: jest.fn<any>(),
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  (mockKillSwitch.isDisabled as jest.Mock).mockReturnValue(false);
  (mockKillSwitch.hasConfig as jest.Mock).mockReturnValue(true);
  (mockRateLimiter.checkLimit as jest.Mock).mockResolvedValue({
    allowed: true,
    remaining: 10,
    reset: 0,
    total: 100,
  });
});

const guard = new TenantIsolationGuard(mockRateLimiter, mockKillSwitch as unknown as TenantKillSwitch);

describe('TenantIsolationGuard', () => {
  const baseContext: TenantContext = {
    tenantId: 'tenant-a',
    environment: 'prod',
    privilegeTier: 'standard',
  };

  describe('RG-007: Cross-Tenant Blocking', () => {
    it('should block access when resource tenant ID does not match context tenant ID', () => {
      const decision = guard.evaluatePolicy(baseContext, {
        action: 'GET:/api/data',
        resourceTenantId: 'tenant-b', // Mismatch
        environment: 'prod',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.status).toBe(403);
      expect(decision.reason).toBe('Cross-tenant access denied');
    });

    it('should allow access when resource tenant ID matches context tenant ID', () => {
      const decision = guard.evaluatePolicy(baseContext, {
        action: 'GET:/api/data',
        resourceTenantId: 'tenant-a', // Match
        environment: 'prod',
      });

      expect(decision.allowed).toBe(true);
    });
  });

  describe('RG-008: Environment Isolation', () => {
    it('should block access when resource environment does not match context environment', () => {
      const devContext: TenantContext = { ...baseContext, environment: 'dev' };
      const decision = guard.evaluatePolicy(devContext, {
        action: 'GET:/api/data',
        resourceTenantId: 'tenant-a',
        environment: 'prod', // Mismatch
      });

      expect(decision.allowed).toBe(false);
      expect(decision.status).toBe(400);
      expect(decision.reason).toBe('Tenant environment mismatch');
    });

    it('should allow access when environments match', () => {
      const decision = guard.evaluatePolicy(baseContext, {
        action: 'GET:/api/data',
        resourceTenantId: 'tenant-a',
        environment: 'prod', // Match
      });

      expect(decision.allowed).toBe(true);
    });
  });

  describe('RG-011: Tenant Kill Switch', () => {
    it('should block access when tenant kill switch is active', () => {
      (mockKillSwitch.isDisabled as jest.Mock).mockReturnValue(true);

      const decision = guard.evaluatePolicy(baseContext, {
        action: 'POST:/api/transaction',
        resourceTenantId: 'tenant-a',
        environment: 'prod',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.status).toBe(423);
      expect(decision.reason).toBe('Tenant kill switch active');
      expect(mockKillSwitch.isDisabled).toHaveBeenCalledWith('tenant-a');
    });
  });

  describe('RG-012: Configuration Safety', () => {
    it('should fail closed (500) if kill switch config is missing in PROD', () => {
      (mockKillSwitch.hasConfig as jest.Mock).mockReturnValue(false);

      const decision = guard.evaluatePolicy(baseContext, {
        action: 'GET:/api/data',
        resourceTenantId: 'tenant-a',
        environment: 'prod',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.status).toBe(500);
      expect(decision.reason).toBe('Kill-switch configuration missing');
    });

    it('should allow missing config in non-prod environments (dev)', () => {
      (mockKillSwitch.hasConfig as jest.Mock).mockReturnValue(false);
      const devContext: TenantContext = { ...baseContext, environment: 'dev' };

      const decision = guard.evaluatePolicy(devContext, {
        action: 'GET:/api/data',
        resourceTenantId: 'tenant-a',
        environment: 'dev',
      });

      // Should proceed to other checks (e.g., mismatch check or allow)
      // Here it matches, so it should allow
      expect(decision.allowed).toBe(true);
    });
  });

  describe('Rate Limiting & Quotas', () => {
    it('should enforce rate limits per bucket', async () => {
      (mockRateLimiter.checkLimit as jest.Mock).mockResolvedValue({
        allowed: false,
        remaining: 0,
        reset: 1000,
        total: 100,
      });

      const result = await guard.enforceRateLimit(baseContext, 'api');
      expect(result.allowed).toBe(false);
      expect(result.bucket).toBe('api');
      expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith(
        expect.stringContaining('tenant:tenant-a:api:prod:standard'),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });
});
