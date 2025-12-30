/**
 * Developer verification harness for per-route rate limiting.
 * Not part of CI. Exists to provide deterministic validation
 * while Jest ESM config issues persist.
 */

import { createRateLimiter, EndpointClass } from '../src/middleware/rateLimit.js';
import assert from 'assert/strict';

// Mocks
const mockRateLimiter = {
  checkLimit: async (key: string, limit: number, windowMs: number) => {
    return {
      allowed: true,
      total: limit,
      remaining: limit - 1,
      reset: Date.now() + 60000,
    };
  },
};

const mockConfig = {
  RATE_LIMIT_ENABLED: true,
};

const mockQuotaManager = {
  getQuotaForTenant: () => null,
};

const mockQuotaOverrideService = {
  hasOverride: async () => false,
};

const mockProvenanceLedger = {
  appendEntry: async () => {},
};

const mockMetrics = {
  rateLimitExceededTotal: {
    labels: () => mockMetrics.rateLimitExceededTotal,
    inc: () => {},
  },
};

// Test Runner
async function runTests() {
  console.log('Running route rate limit verification...');

  const req = {
    path: '/api/test',
    ip: '127.0.0.1',
    headers: {},
    user: undefined,
    tenant: undefined,
  };

  const res = {
    _status: 200,
    _json: null as any,
    _headers: {} as Record<string, string>,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(data: any) {
      this._json = data;
      return this;
    },
    set(key: string, value: string) {
      this._headers[key] = value;
    },
  };

  const next = () => {
    // console.log('next() called');
  };

  const deps = {
    rateLimiter: mockRateLimiter,
    metrics: mockMetrics,
    provenanceLedger: mockProvenanceLedger,
    quotaManager: mockQuotaManager,
    quotaOverrideService: mockQuotaOverrideService,
    config: mockConfig,
  };

  // Test 1: Default Route
  console.log('Test 1: Default Route Limit');
  req.path = '/api/unknown';
  // Spy on checkLimit
  let lastCheckLimitArgs: any[] = [];
  mockRateLimiter.checkLimit = async (...args) => {
      lastCheckLimitArgs = args;
      return { allowed: true, total: args[1], remaining: args[1]-1, reset: Date.now() + 60000 };
  };

  const middleware = createRateLimiter(EndpointClass.DEFAULT, deps);
  await middleware(req as any, res as any, next);

  // Default limit is 60. Anon IP -> 30.
  assert.equal(lastCheckLimitArgs[1], 30, 'Default limit for anon should be 30');
  console.log('PASS: Default Route Limit');

  // Test 2: Sensitive Route
  console.log('Test 2: Sensitive Route Limit');
  req.path = '/api/auth/login';
  await middleware(req as any, res as any, next);

  // Sensitive limit is 5. Anon IP -> 2.
  assert.equal(lastCheckLimitArgs[1], 2, 'Sensitive limit for anon should be 2');
  console.log('PASS: Sensitive Route Limit');

  // Test 3: High Volume Route
  console.log('Test 3: High Volume Route Limit');
  req.path = '/api/data/ingest';
  await middleware(req as any, res as any, next);

  // High volume limit is 1000. Anon IP -> 500.
  assert.equal(lastCheckLimitArgs[1], 500, 'High volume limit for anon should be 500');
  console.log('PASS: High Volume Route Limit');

  // Test 4: Adaptive Cooloff
  console.log('Test 4: Adaptive Cooloff');
  req.path = '/api/auth/login';

  // Mock Blocked
  mockRateLimiter.checkLimit = async (...args) => {
      return { allowed: false, total: args[1], remaining: 0, reset: Date.now() + 60000 };
  };

  // Hit it repeatedly to trigger cooloff
  // Threshold is 5.
  for (let i = 0; i < 6; i++) {
      await middleware(req as any, res as any, next);
      assert.equal(res._status, 429);
  }

  // Check headers on the last one
  // Cooloff should be active on the 6th attempt (count > 5)
  if (res._headers['X-RateLimit-Cooloff'] !== 'true') {
      console.warn('WARNING: X-RateLimit-Cooloff header missing. Check threshold logic.');
  }
  assert.equal(res._headers['X-RateLimit-Cooloff'], 'true', 'Cooloff header should be present');
  console.log('PASS: Adaptive Cooloff');

  console.log('All verification tests passed.');
}

runTests().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
