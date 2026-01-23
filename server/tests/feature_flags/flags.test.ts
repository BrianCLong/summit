import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { FeatureFlagProvider } from '../../src/feature_flags/provider.js';
import { FeatureFlags } from '../../src/feature_flags/registry.js';
import { isEnabled, requireFlag } from '../../src/feature_flags/index.js';

describe('Feature Flags', () => {
  beforeEach(() => {
    FeatureFlagProvider.getInstance().clearOverrides();
  });

  it('should return default value', () => {
    // NEW_SEARCH_ALGORITHM is false by default
    expect(isEnabled(FeatureFlags.NEW_SEARCH_ALGORITHM)).toBe(false);
  });

  it('should allow overrides', () => {
    FeatureFlagProvider.getInstance().setOverride(FeatureFlags.NEW_SEARCH_ALGORITHM, true);
    expect(isEnabled(FeatureFlags.NEW_SEARCH_ALGORITHM)).toBe(true);
  });

  it('should respect environment variables', () => {
    process.env.FLAG_BETA_DASHBOARD = 'true';
    // Re-initialize or clear to pick up env
    FeatureFlagProvider.getInstance().clearOverrides();

    expect(isEnabled(FeatureFlags.BETA_DASHBOARD)).toBe(true);

    delete process.env.FLAG_BETA_DASHBOARD;
  });

  it('decorator should throw if disabled', () => {
    class TestClass {
      @requireFlag(FeatureFlags.BETA_DASHBOARD)
      doSomething() {
        return 'done';
      }
    }

    const instance = new TestClass();
    expect(() => instance.doSomething()).toThrow('Feature beta_dashboard is not enabled');

    FeatureFlagProvider.getInstance().setOverride(FeatureFlags.BETA_DASHBOARD, true);
    expect(instance.doSomething()).toBe('done');
  });
});
