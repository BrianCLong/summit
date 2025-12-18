import { jest } from '@jest/globals';
import { resetConfigForTesting, loadConfig } from '../src/config/index';
import { FeatureFlags } from '../src/config/featureFlags';

describe('Config System', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    resetConfigForTesting();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('loads defaults correctly', () => {
    delete process.env.PORT;
    // We assume NODE_ENV default is 'development'
    delete process.env.NODE_ENV;

    const config = loadConfig();
    expect(config.env).toBe('development');
    expect(config.serverPort).toBe(4000);
  });

  test('validates and overrides fields', () => {
    process.env.PORT = '9090';
    const config = loadConfig();
    expect(config.serverPort).toBe(9090);
  });

  test('feature flags are loaded from env', () => {
    process.env.FEATURE_MAESTRO_NEW_RUN_CONSOLE = 'true';
    const config = loadConfig();
    expect(config.features['maestro.newRunConsole']).toBe(true);
    expect(config.featureFlags.isEnabled('maestro.newRunConsole')).toBe(true);
  });

  test('legacy feature keys are respected', () => {
    process.env.GRAPH_EXPAND_CACHE = 'true';
    const config = loadConfig();
    expect(config.features.GRAPH_EXPAND_CACHE).toBe(true);
  });
});

describe('FeatureFlags', () => {
  it('should return default value if key missing', () => {
    const flags = new FeatureFlags({});
    expect(flags.isEnabled('ai.enabled')).toBe(false);
  });

  it('should respect explicit value', () => {
    const flags = new FeatureFlags({ 'ai.enabled': true });
    expect(flags.isEnabled('ai.enabled')).toBe(true);
  });
});
