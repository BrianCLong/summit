import { ConfigService, TargetingRule } from '../src/config/ConfigService';

describe('ConfigService', () => {
  // Mock process.env before each test
  const originalEnv = process.env;
  let configService: ConfigService;

  beforeEach(() => {
    jest.resetModules(); // Reset modules to ensure ConfigService re-initializes
    process.env = { ...originalEnv };

    // Setup minimal env vars to pass validation
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    process.env.NEO4J_URI = 'bolt://localhost:7687';
    process.env.NEO4J_USERNAME = 'neo4j';
    process.env.NEO4J_PASSWORD = 'password';
    process.env.JWT_SECRET = 'super_secret_key_32_chars_long_at_least';
    process.env.JWT_REFRESH_SECRET = 'super_secret_refresh_key_32_chars_long';

    // We need to instantiate ConfigService manually or via getInstance if we can reset the singleton
    // Since it's a singleton, we might need to expose a reset method or just test the instance.
    // For testing purposes, let's rely on the fact that we can't easily reset the singleton
    // in the same process without some hacks, but jest.resetModules might help if we were importing it fresh.
    // However, ConfigService.ts keeps the instance in a static property.

    // Hack to reset singleton for testing
    // @ts-ignore
    ConfigService.instance = undefined;
    configService = ConfigService.getInstance();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should load configuration from environment variables', () => {
    expect(configService.get('postgres').url).toContain('postgres://');
    expect(configService.get('auth').jwtSecret).toBe('super_secret_key_32_chars_long_at_least');
  });

  test('should default feature flags correctly', () => {
    const flags = configService.getAllFlags();
    // Assuming defaults are mostly true or false based on provided env logic
    // In ConfigService we didn't set FEATURE_X env vars, so they should fall back to defaults
    // But defaults rely on config.features which relies on env vars.
    // In ConfigService:
    // GRAPH_EXPAND_CACHE: env.GRAPH_EXPAND_CACHE !== '0', => true (undefined !== '0')
    expect(configService.isFeatureEnabled('GRAPH_EXPAND_CACHE')).toBe(true);
  });

  test('should allow runtime overrides of feature flags', () => {
    configService.setFeatureFlag('TEST_FLAG', true);
    expect(configService.isFeatureEnabled('TEST_FLAG')).toBe(true);
    configService.setFeatureFlag('TEST_FLAG', false);
    expect(configService.isFeatureEnabled('TEST_FLAG')).toBe(false);
  });

  describe('Targeting Rules', () => {
    test('should respect "equals" operator', () => {
      configService.setFeatureFlag('BETA_FEATURE', false); // Disabled globally
      const rule: TargetingRule = {
        attribute: 'user_role',
        operator: 'equals',
        value: 'admin'
      };
      configService.addTargetingRule('BETA_FEATURE', rule);

      expect(configService.isFeatureEnabled('BETA_FEATURE', { user_role: 'user' })).toBe(false);
      expect(configService.isFeatureEnabled('BETA_FEATURE', { user_role: 'admin' })).toBe(true);
    });

    test('should respect "contains" operator', () => {
        configService.setFeatureFlag('NEW_UI', false);
        const rule: TargetingRule = {
            attribute: 'email',
            operator: 'contains',
            value: '@company.com'
        };
        configService.addTargetingRule('NEW_UI', rule);

        expect(configService.isFeatureEnabled('NEW_UI', { email: 'john@gmail.com' })).toBe(false);
        expect(configService.isFeatureEnabled('NEW_UI', { email: 'jane@company.com' })).toBe(true);
    });

    test('should respect "in" operator', () => {
        configService.setFeatureFlag('SPECIAL_ACCESS', false);
        const rule: TargetingRule = {
            attribute: 'tenantId',
            operator: 'in',
            value: ['tenant1', 'tenant2']
        };
        configService.addTargetingRule('SPECIAL_ACCESS', rule);

        expect(configService.isFeatureEnabled('SPECIAL_ACCESS', { tenantId: 'tenant3' })).toBe(false);
        expect(configService.isFeatureEnabled('SPECIAL_ACCESS', { tenantId: 'tenant1' })).toBe(true);
    });

    test('should respect "percentage_rollout"', () => {
        configService.setFeatureFlag('ROLLOUT_FEATURE', false);
        const rule: TargetingRule = {
            attribute: 'userId',
            operator: 'percentage_rollout',
            value: null, // value ignored
            percentage: 50
        };
        configService.addTargetingRule('ROLLOUT_FEATURE', rule);

        // We need to check that it returns consistently for the same user
        const user1 = 'user1'; // Hash might put this in or out
        const result1 = configService.isFeatureEnabled('ROLLOUT_FEATURE', { userId: user1 });
        const result2 = configService.isFeatureEnabled('ROLLOUT_FEATURE', { userId: user1 });
        expect(result1).toBe(result2);
    });
  });
});
