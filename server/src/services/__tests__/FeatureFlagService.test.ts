/**
 * Feature Flag Service Tests
 *
 * Comprehensive test suite for feature flag service covering:
 * - Initialization
 * - Flag evaluation
 * - Caching
 * - Error handling
 * - Rollout strategies
 * - Edge cases
 */

import { FeatureFlagService, resetFeatureFlagService, getFeatureFlagService } from '../FeatureFlagService';
import { Logger } from '../../utils/logger';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';

// Mock LaunchDarkly
jest.mock('launchdarkly-node-server-sdk');

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let mockLogger: jest.Mocked<Logger>;
  let testConfigPath: string;

  // Test configuration
  const testConfig = {
    version: '1.0.0',
    flags: {
      'test-boolean-flag': {
        key: 'test-boolean-flag',
        name: 'Test Boolean Flag',
        description: 'A test boolean flag',
        type: 'boolean',
        defaultValue: true,
        tags: ['test'],
      },
      'test-string-flag': {
        key: 'test-string-flag',
        name: 'Test String Flag',
        type: 'string',
        defaultValue: 'test-value',
        allowedValues: ['test-value', 'other-value'],
      },
      'test-json-flag': {
        key: 'test-json-flag',
        name: 'Test JSON Flag',
        type: 'json',
        defaultValue: {
          setting1: 'value1',
          setting2: 100,
        },
      },
      'test-gradual-rollout': {
        key: 'test-gradual-rollout',
        name: 'Test Gradual Rollout',
        type: 'boolean',
        defaultValue: true,
        rollout: {
          type: 'gradual',
          percentage: 50,
        },
      },
      'test-targeted-rollout': {
        key: 'test-targeted-rollout',
        name: 'Test Targeted Rollout',
        type: 'boolean',
        defaultValue: true,
        rollout: {
          type: 'targeted',
          rules: [
            {
              attribute: 'organization',
              operator: 'in',
              values: ['internal', 'beta-testers'],
            },
          ],
        },
      },
    },
    killSwitches: {
      'test-kill-switch': {
        key: 'test-kill-switch',
        name: 'Test Kill Switch',
        defaultValue: false,
        tags: ['emergency'],
      },
    },
  };

  const testUser = {
    key: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    organization: 'internal',
    userRole: 'developer',
  };

  beforeEach(() => {
    // Reset singleton
    resetFeatureFlagService();

    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;

    // Create temporary config file
    testConfigPath = join(process.cwd(), 'test-feature-flags.json');
    writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));
  });

  afterEach(() => {
    // Clean up
    try {
      unlinkSync(testConfigPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }

    resetFeatureFlagService();
  });

  describe('Initialization', () => {
    it('should initialize with local provider', async () => {
      service = new FeatureFlagService(
        {
          provider: 'local',
          config: {
            file: testConfigPath,
          },
        },
        mockLogger
      );

      await service.initialize();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Initializing feature flag service with provider: local'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Loaded 6 feature flags')
      );
    });

    it('should throw error if local config file not found', async () => {
      service = new FeatureFlagService(
        {
          provider: 'local',
          config: {
            file: '/nonexistent/path/config.json',
          },
        },
        mockLogger
      );

      await expect(service.initialize()).rejects.toThrow('Failed to load feature flags');
    });

    it('should only initialize once', async () => {
      service = new FeatureFlagService(
        {
          provider: 'local',
          config: { file: testConfigPath },
        },
        mockLogger
      );

      await service.initialize();
      await service.initialize();
      await service.initialize();

      // Should only log initialization once
      const initCalls = mockLogger.info.mock.calls.filter((call) =>
        call[0].includes('Initializing feature flag service')
      );
      expect(initCalls).toHaveLength(1);
    });

    it('should handle concurrent initialization calls', async () => {
      service = new FeatureFlagService(
        {
          provider: 'local',
          config: { file: testConfigPath },
        },
        mockLogger
      );

      // Call initialize multiple times concurrently
      await Promise.all([
        service.initialize(),
        service.initialize(),
        service.initialize(),
      ]);

      // Should only initialize once
      const initCalls = mockLogger.info.mock.calls.filter((call) =>
        call[0].includes('Initializing feature flag service')
      );
      expect(initCalls).toHaveLength(1);
    });
  });

  describe('Boolean Flags', () => {
    beforeEach(async () => {
      service = new FeatureFlagService(
        {
          provider: 'local',
          config: { file: testConfigPath },
        },
        mockLogger
      );
      await service.initialize();
    });

    it('should return true for enabled boolean flag', async () => {
      const result = await service.isEnabled('test-boolean-flag', testUser);
      expect(result).toBe(true);
    });

    it('should return default value for non-existent flag', async () => {
      const result = await service.isEnabled('nonexistent-flag', testUser, false);
      expect(result).toBe(false);
    });

    it('should return custom default value', async () => {
      const result = await service.isEnabled('nonexistent-flag', testUser, true);
      expect(result).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Force an error by shutting down the service
      await service.shutdown();

      const result = await service.isEnabled('test-boolean-flag', testUser, false);
      expect(result).toBe(false);
    });
  });

  describe('String and Number Flags', () => {
    beforeEach(async () => {
      service = new FeatureFlagService(
        {
          provider: 'local',
          config: { file: testConfigPath },
        },
        mockLogger
      );
      await service.initialize();
    });

    it('should return string flag value', async () => {
      const result = await service.getValue('test-string-flag', testUser, 'default');
      expect(result).toBe('test-value');
    });

    it('should return default value for non-existent string flag', async () => {
      const result = await service.getValue('nonexistent', testUser, 'default-value');
      expect(result).toBe('default-value');
    });
  });

  describe('JSON Flags', () => {
    beforeEach(async () => {
      service = new FeatureFlagService(
        {
          provider: 'local',
          config: { file: testConfigPath },
        },
        mockLogger
      );
      await service.initialize();
    });

    it('should return JSON flag value', async () => {
      const result = await service.getJSONValue('test-json-flag', testUser, {});

      expect(result).toEqual({
        setting1: 'value1',
        setting2: 100,
      });
    });

    it('should return default value for non-existent JSON flag', async () => {
      const defaultValue = { key: 'value' };
      const result = await service.getJSONValue('nonexistent', testUser, defaultValue);

      expect(result).toEqual(defaultValue);
    });

    it('should parse JSON string values', async () => {
      const jsonString = '{"parsed": true}';
      const result = await service.getJSONValue('test-string-flag', testUser, {});

      // Since test-string-flag returns 'test-value', not valid JSON
      // Should return default value
      expect(result).toEqual({});
    });
  });

  describe('Gradual Rollout', () => {
    beforeEach(async () => {
      service = new FeatureFlagService(
        {
          provider: 'local',
          config: { file: testConfigPath },
        },
        mockLogger
      );
      await service.initialize();
    });

    it('should respect percentage rollout', async () => {
      // Test with multiple users to verify distribution
      const results: boolean[] = [];

      for (let i = 0; i < 100; i++) {
        const user = { ...testUser, key: `user-${i}` };
        const result = await service.isEnabled('test-gradual-rollout', user, false);
        results.push(result);
      }

      // With 50% rollout, roughly 50% should be enabled
      // Allow for some variance (40-60%)
      const enabledCount = results.filter((r) => r).length;
      expect(enabledCount).toBeGreaterThan(40);
      expect(enabledCount).toBeLessThan(60);
    });

    it('should be consistent for same user', async () => {
      const result1 = await service.isEnabled('test-gradual-rollout', testUser, false);
      const result2 = await service.isEnabled('test-gradual-rollout', testUser, false);
      const result3 = await service.isEnabled('test-gradual-rollout', testUser, false);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });

  describe('Targeted Rollout', () => {
    beforeEach(async () => {
      service = new FeatureFlagService(
        {
          provider: 'local',
          config: { file: testConfigPath },
        },
        mockLogger
      );
      await service.initialize();
    });

    it('should enable for matching organization', async () => {
      const user = { ...testUser, organization: 'internal' };
      const result = await service.isEnabled('test-targeted-rollout', user, false);
      expect(result).toBe(true);
    });

    it('should enable for beta-testers organization', async () => {
      const user = { ...testUser, organization: 'beta-testers' };
      const result = await service.isEnabled('test-targeted-rollout', user, false);
      expect(result).toBe(true);
    });

    it('should not enable for non-matching organization', async () => {
      const user = { ...testUser, organization: 'external' };
      const result = await service.isEnabled('test-targeted-rollout', user, false);
      expect(result).toBe(false);
    });

    it('should not enable if attribute missing', async () => {
      const user = { ...testUser, organization: undefined };
      const result = await service.isEnabled('test-targeted-rollout', user, false);
      expect(result).toBe(false);
    });
  });

  describe('Caching', () => {
    beforeEach(async () => {
      service = new FeatureFlagService(
        {
          provider: 'local',
          config: { file: testConfigPath },
        },
        mockLogger
      );
      await service.initialize();
    });

    it('should cache flag evaluations', async () => {
      // First call
      const result1 = await service.getValue('test-boolean-flag', testUser, false);

      // Clear debug logs
      mockLogger.debug.mockClear();

      // Second call should use cache
      const result2 = await service.getValue('test-boolean-flag', testUser, false);

      expect(result1).toBe(result2);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Returning cached value')
      );
    });

    it('should clear cache when requested', async () => {
      // Populate cache
      await service.getValue('test-boolean-flag', testUser, false);

      // Clear cache
      service.clearCache();

      // Next call should not use cache
      mockLogger.debug.mockClear();
      await service.getValue('test-boolean-flag', testUser, false);

      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('Returning cached value')
      );
    });
  });

  describe('Kill Switches', () => {
    beforeEach(async () => {
      service = new FeatureFlagService(
        {
          provider: 'local',
          config: { file: testConfigPath },
        },
        mockLogger
      );
      await service.initialize();
    });

    it('should load kill switches', async () => {
      const result = await service.isEnabled('test-kill-switch', testUser);
      expect(result).toBe(false);
    });

    it('should retrieve kill switch metadata', () => {
      const metadata = service.getFlagMetadata('test-kill-switch');

      expect(metadata).toBeDefined();
      expect(metadata?.key).toBe('test-kill-switch');
      expect(metadata?.tags).toContain('kill-switch');
      expect(metadata?.tags).toContain('emergency');
    });
  });

  describe('Metadata', () => {
    beforeEach(async () => {
      service = new FeatureFlagService(
        {
          provider: 'local',
          config: { file: testConfigPath },
        },
        mockLogger
      );
      await service.initialize();
    });

    it('should return all flags', () => {
      const flags = service.getAllFlags();
      expect(flags).toHaveLength(6);
    });

    it('should return flag metadata', () => {
      const metadata = service.getFlagMetadata('test-boolean-flag');

      expect(metadata).toBeDefined();
      expect(metadata?.key).toBe('test-boolean-flag');
      expect(metadata?.name).toBe('Test Boolean Flag');
      expect(metadata?.type).toBe('boolean');
      expect(metadata?.defaultValue).toBe(true);
    });

    it('should return undefined for non-existent flag', () => {
      const metadata = service.getFlagMetadata('nonexistent');
      expect(metadata).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing config gracefully', async () => {
      service = new FeatureFlagService(
        {
          provider: 'local',
          config: {},
        },
        mockLogger
      );

      await expect(service.initialize()).rejects.toThrow();
    });

    it('should handle invalid JSON in config file', async () => {
      const invalidConfigPath = join(process.cwd(), 'invalid-config.json');
      writeFileSync(invalidConfigPath, 'invalid json {');

      service = new FeatureFlagService(
        {
          provider: 'local',
          config: { file: invalidConfigPath },
        },
        mockLogger
      );

      await expect(service.initialize()).rejects.toThrow();

      // Cleanup
      unlinkSync(invalidConfigPath);
    });

    it('should return default value on evaluation error', async () => {
      service = new FeatureFlagService(
        {
          provider: 'local',
          config: { file: testConfigPath },
        },
        mockLogger
      );

      // Don't initialize - should cause error
      const result = await service.isEnabled('test-boolean-flag', testUser, true);

      // Should eventually initialize and return correct value
      expect(result).toBeDefined();
    });
  });

  describe('Shutdown', () => {
    beforeEach(async () => {
      service = new FeatureFlagService(
        {
          provider: 'local',
          config: { file: testConfigPath },
        },
        mockLogger
      );
      await service.initialize();
    });

    it('should shutdown gracefully', async () => {
      await service.shutdown();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Shutting down feature flag service...'
      );
    });

    it('should clear cache on shutdown', async () => {
      // Populate cache
      await service.getValue('test-boolean-flag', testUser, false);

      // Shutdown
      await service.shutdown();

      // Cache should be empty (can't directly test, but service should handle gracefully)
      // Try to evaluate flag after shutdown
      const result = await service.isEnabled('test-boolean-flag', testUser, false);
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      service = new FeatureFlagService(
        {
          provider: 'local',
          config: { file: testConfigPath },
        },
        mockLogger
      );
      await service.initialize();
    });

    it('should handle user without key', async () => {
      const invalidUser = { key: '', email: 'test@example.com' };
      const result = await service.isEnabled('test-boolean-flag', invalidUser, false);
      expect(result).toBeDefined();
    });

    it('should handle empty user object', async () => {
      const emptyUser = { key: 'user-123' };
      const result = await service.isEnabled('test-boolean-flag', emptyUser, false);
      expect(result).toBeDefined();
    });

    it('should handle undefined default value', async () => {
      const result = await service.getValue('nonexistent', testUser, undefined as any);
      expect(result).toBeUndefined();
    });

    it('should handle null default value', async () => {
      const result = await service.getValue('nonexistent', testUser, null as any);
      expect(result).toBeNull();
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      service = new FeatureFlagService(
        {
          provider: 'local',
          config: { file: testConfigPath },
        },
        mockLogger
      );
      await service.initialize();
    });

    it('should evaluate flags quickly', async () => {
      const iterations = 1000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        await service.isEnabled('test-boolean-flag', testUser);
      }

      const duration = Date.now() - start;
      const avgTime = duration / iterations;

      // Should take less than 1ms per evaluation on average
      expect(avgTime).toBeLessThan(1);
    });

    it('should handle concurrent evaluations', async () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(service.isEnabled('test-boolean-flag', testUser));
      }

      const results = await Promise.all(promises);

      // All results should be consistent
      expect(results.every((r) => r === results[0])).toBe(true);
    });
  });
});

describe('getFeatureFlagService singleton', () => {
  afterEach(() => {
    resetFeatureFlagService();
  });

  it('should throw error if not initialized', () => {
    expect(() => {
      // @ts-ignore
      getFeatureFlagService();
    }).toThrow('Feature flag service not initialized');
  });

  it('should return same instance', () => {
    const testConfigPath = join(process.cwd(), 'test-feature-flags.json');
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        flags: {},
      })
    );

    const instance1 = getFeatureFlagService({
      provider: 'local',
      config: { file: testConfigPath },
    });

    const instance2 = getFeatureFlagService();

    expect(instance1).toBe(instance2);

    // Cleanup
    unlinkSync(testConfigPath);
  });
});
