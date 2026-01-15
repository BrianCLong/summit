import { describe, test, expect, jest, beforeEach, afterAll } from '@jest/globals';

const loadConfigFresh = async () => {
  jest.resetModules();
  return (await import('../src/config/load.js')).loadConfig;
};

const loadFeatureFlagsFresh = async () => {
  jest.resetModules();
  return (await import('../src/config/featureFlags.js')).FeatureFlags;
};

describe('Config System', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('loads defaults correctly', async () => {
    delete process.env.PORT;
    delete process.env.NODE_ENV;

    const loadConfig = await loadConfigFresh();
    const config = loadConfig();
    expect(config.env).toBe('development');
    expect(config.port).toBe(4000);
  });

  test('validates and overrides fields', async () => {
    process.env.PORT = '9090';
    const loadConfig = await loadConfigFresh();
    const config = loadConfig();
    expect(config.port).toBe(9090);
  });

  test('feature flags are loaded from env', async () => {
    process.env.FEATURE_MAESTRO_NEW_RUN_CONSOLE = 'true';
    const FeatureFlags = await loadFeatureFlagsFresh();
    const flags = FeatureFlags.getInstance();
    expect(flags.isEnabled('maestro.newRunConsole')).toBe(true);
  });

  test('legacy feature keys are respected', async () => {
    process.env.GRAPH_EXPAND_CACHE = 'true';
    const loadConfig = await loadConfigFresh();
    const config = loadConfig();
    expect(config.features.GRAPH_EXPAND_CACHE).toBe(true);
  });
});

describe('FeatureFlags', () => {
  test('should return default value if key missing', async () => {
    const FeatureFlags = await loadFeatureFlagsFresh();
    const flags = FeatureFlags.getInstance();
    expect(flags.isEnabled('ai.enabled')).toBe(true);
  });

  test('should respect explicit value', async () => {
    process.env.FEATURE_AI_ENABLED = 'false';
    const FeatureFlags = await loadFeatureFlagsFresh();
    const flags = FeatureFlags.getInstance();
    expect(flags.isEnabled('ai.enabled')).toBe(false);
  });
});
