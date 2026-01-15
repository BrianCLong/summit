import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { loadFeatureFlags, resetFeatureFlags } from '../feature-flags';

describe('feature flag configuration', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    resetFeatureFlags();
  });

  test('parses common truthy and falsy variants', () => {
    const flags = loadFeatureFlags({
      PRICE_AWARE_ENABLED: 'no',
      PRICING_REFRESH_ENABLED: '0',
      CAPACITY_FUTURES_ENABLED: 'yes',
      PRICE_AWARE_FORCE_POOL_ID: 'pool-forced',
      PRICE_AWARE_FAIL_OPEN: 'false',
    } as NodeJS.ProcessEnv);

    expect(flags.PRICE_AWARE_ENABLED).toBe(false);
    expect(flags.PRICING_REFRESH_ENABLED).toBe(false);
    expect(flags.CAPACITY_FUTURES_ENABLED).toBe(true);
    expect(flags.PRICE_AWARE_FORCE_POOL_ID).toBe('pool-forced');
    expect(flags.PRICE_AWARE_FAIL_OPEN).toBe(false);
  });

  test('falls back to defaults when env vars are missing', () => {
    const flags = loadFeatureFlags({} as NodeJS.ProcessEnv);

    expect(flags.PRICE_AWARE_ENABLED).toBe(true);
    expect(flags.PRICING_REFRESH_ENABLED).toBe(true);
    expect(flags.CAPACITY_FUTURES_ENABLED).toBe(true);
    expect(flags.PRICE_AWARE_FORCE_POOL_ID).toBeUndefined();
    expect(flags.PRICE_AWARE_FAIL_OPEN).toBe(true);
  });
});
