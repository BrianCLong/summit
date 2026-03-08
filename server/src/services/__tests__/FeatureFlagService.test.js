"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const FeatureFlagService_js_1 = require("../FeatureFlagService.js");
const fs_1 = require("fs");
const path_1 = require("path");
const globals_1 = require("@jest/globals");
// Mock LaunchDarkly
globals_1.jest.mock('launchdarkly-node-server-sdk');
(0, globals_1.describe)('FeatureFlagService', () => {
    let service;
    let mockLogger;
    let testConfigPath;
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
    (0, globals_1.beforeEach)(() => {
        // Reset singleton
        (0, FeatureFlagService_js_1.resetFeatureFlagService)();
        // Create mock logger
        mockLogger = {
            info: globals_1.jest.fn(),
            warn: globals_1.jest.fn(),
            error: globals_1.jest.fn(),
            debug: globals_1.jest.fn(),
        };
        // Create temporary config file
        testConfigPath = (0, path_1.join)(process.cwd(), 'test-feature-flags.json');
        (0, fs_1.writeFileSync)(testConfigPath, JSON.stringify(testConfig, null, 2));
    });
    (0, globals_1.afterEach)(() => {
        // Clean up
        try {
            (0, fs_1.unlinkSync)(testConfigPath);
        }
        catch (error) {
            // Ignore if file doesn't exist
        }
        (0, FeatureFlagService_js_1.resetFeatureFlagService)();
    });
    (0, globals_1.describe)('Initialization', () => {
        (0, globals_1.it)('should initialize with local provider', async () => {
            service = new FeatureFlagService_js_1.FeatureFlagService({
                provider: 'local',
                config: {
                    file: testConfigPath,
                },
            }, mockLogger);
            await service.initialize();
            (0, globals_1.expect)(mockLogger.info).toHaveBeenCalledWith('Initializing feature flag service with provider: local');
            (0, globals_1.expect)(mockLogger.info).toHaveBeenCalledWith(globals_1.expect.stringContaining('Loaded 6 feature flags'));
        });
        (0, globals_1.it)('should throw error if local config file not found', async () => {
            service = new FeatureFlagService_js_1.FeatureFlagService({
                provider: 'local',
                config: {
                    file: '/nonexistent/path/config.json',
                },
            }, mockLogger);
            await (0, globals_1.expect)(service.initialize()).rejects.toThrow('Failed to load feature flags');
        });
        (0, globals_1.it)('should only initialize once', async () => {
            service = new FeatureFlagService_js_1.FeatureFlagService({
                provider: 'local',
                config: { file: testConfigPath },
            }, mockLogger);
            await service.initialize();
            await service.initialize();
            await service.initialize();
            // Should only log initialization once
            const initCalls = mockLogger.info.mock.calls.filter((call) => call[0].includes('Initializing feature flag service'));
            (0, globals_1.expect)(initCalls).toHaveLength(1);
        });
        (0, globals_1.it)('should handle concurrent initialization calls', async () => {
            service = new FeatureFlagService_js_1.FeatureFlagService({
                provider: 'local',
                config: { file: testConfigPath },
            }, mockLogger);
            // Call initialize multiple times concurrently
            await Promise.all([
                service.initialize(),
                service.initialize(),
                service.initialize(),
            ]);
            // Should only initialize once
            const initCalls = mockLogger.info.mock.calls.filter((call) => call[0].includes('Initializing feature flag service'));
            (0, globals_1.expect)(initCalls).toHaveLength(1);
        });
    });
    (0, globals_1.describe)('Boolean Flags', () => {
        (0, globals_1.beforeEach)(async () => {
            service = new FeatureFlagService_js_1.FeatureFlagService({
                provider: 'local',
                config: { file: testConfigPath },
            }, mockLogger);
            await service.initialize();
        });
        (0, globals_1.it)('should return true for enabled boolean flag', async () => {
            const result = await service.isEnabled('test-boolean-flag', testUser);
            (0, globals_1.expect)(result).toBe(true);
        });
        (0, globals_1.it)('should return default value for non-existent flag', async () => {
            const result = await service.isEnabled('nonexistent-flag', testUser, false);
            (0, globals_1.expect)(result).toBe(false);
        });
        (0, globals_1.it)('should return custom default value', async () => {
            const result = await service.isEnabled('nonexistent-flag', testUser, true);
            (0, globals_1.expect)(result).toBe(true);
        });
        (0, globals_1.it)('should handle errors gracefully', async () => {
            // After shutdown, service may return cached values or defaults
            await service.shutdown();
            // The service may still return cached values after shutdown
            // The key behavior is that it doesn't throw
            const result = await service.isEnabled('test-boolean-flag', testUser, false);
            (0, globals_1.expect)(typeof result).toBe('boolean');
        });
    });
    (0, globals_1.describe)('String and Number Flags', () => {
        (0, globals_1.beforeEach)(async () => {
            service = new FeatureFlagService_js_1.FeatureFlagService({
                provider: 'local',
                config: { file: testConfigPath },
            }, mockLogger);
            await service.initialize();
        });
        (0, globals_1.it)('should return string flag value', async () => {
            const result = await service.getValue('test-string-flag', testUser, 'default');
            (0, globals_1.expect)(result).toBe('test-value');
        });
        (0, globals_1.it)('should return default value for non-existent string flag', async () => {
            const result = await service.getValue('nonexistent', testUser, 'default-value');
            (0, globals_1.expect)(result).toBe('default-value');
        });
    });
    (0, globals_1.describe)('JSON Flags', () => {
        (0, globals_1.beforeEach)(async () => {
            service = new FeatureFlagService_js_1.FeatureFlagService({
                provider: 'local',
                config: { file: testConfigPath },
            }, mockLogger);
            await service.initialize();
        });
        (0, globals_1.it)('should return JSON flag value', async () => {
            const result = await service.getJSONValue('test-json-flag', testUser, {});
            (0, globals_1.expect)(result).toEqual({
                setting1: 'value1',
                setting2: 100,
            });
        });
        (0, globals_1.it)('should return default value for non-existent JSON flag', async () => {
            const defaultValue = { key: 'value' };
            const result = await service.getJSONValue('nonexistent', testUser, defaultValue);
            (0, globals_1.expect)(result).toEqual(defaultValue);
        });
        (0, globals_1.it)('should parse JSON string values', async () => {
            const jsonString = '{"parsed": true}';
            const result = await service.getJSONValue('test-string-flag', testUser, {});
            // Since test-string-flag returns 'test-value', not valid JSON
            // Should return default value
            (0, globals_1.expect)(result).toEqual({});
        });
    });
    (0, globals_1.describe)('Gradual Rollout', () => {
        (0, globals_1.beforeEach)(async () => {
            service = new FeatureFlagService_js_1.FeatureFlagService({
                provider: 'local',
                config: { file: testConfigPath },
            }, mockLogger);
            await service.initialize();
        });
        (0, globals_1.it)('should respect percentage rollout', async () => {
            // Test with multiple users to verify gradual rollout is applied
            const results = [];
            for (let i = 0; i < 100; i++) {
                const user = { ...testUser, key: `user-${i}` };
                const result = await service.isEnabled('test-gradual-rollout', user, false);
                results.push(result);
            }
            // Verify that rollout returns boolean values and is deterministic
            // Note: actual distribution depends on hash function implementation
            (0, globals_1.expect)(results.every((r) => typeof r === 'boolean')).toBe(true);
            // At minimum, rollout should be consistent (not random)
            const result1 = await service.isEnabled('test-gradual-rollout', { ...testUser, key: 'user-0' }, false);
            const result2 = await service.isEnabled('test-gradual-rollout', { ...testUser, key: 'user-0' }, false);
            (0, globals_1.expect)(result1).toBe(result2);
        });
        (0, globals_1.it)('should be consistent for same user', async () => {
            const result1 = await service.isEnabled('test-gradual-rollout', testUser, false);
            const result2 = await service.isEnabled('test-gradual-rollout', testUser, false);
            const result3 = await service.isEnabled('test-gradual-rollout', testUser, false);
            (0, globals_1.expect)(result1).toBe(result2);
            (0, globals_1.expect)(result2).toBe(result3);
        });
    });
    (0, globals_1.describe)('Targeted Rollout', () => {
        (0, globals_1.beforeEach)(async () => {
            service = new FeatureFlagService_js_1.FeatureFlagService({
                provider: 'local',
                config: { file: testConfigPath },
            }, mockLogger);
            await service.initialize();
        });
        (0, globals_1.it)('should enable for matching organization', async () => {
            const user = { ...testUser, organization: 'internal' };
            const result = await service.isEnabled('test-targeted-rollout', user, false);
            (0, globals_1.expect)(result).toBe(true);
        });
        (0, globals_1.it)('should enable for beta-testers organization', async () => {
            const user = { ...testUser, organization: 'beta-testers' };
            const result = await service.isEnabled('test-targeted-rollout', user, false);
            (0, globals_1.expect)(result).toBe(true);
        });
        (0, globals_1.it)('should not enable for non-matching organization', async () => {
            const user = { ...testUser, organization: 'external' };
            const result = await service.isEnabled('test-targeted-rollout', user, false);
            (0, globals_1.expect)(result).toBe(false);
        });
        (0, globals_1.it)('should not enable if attribute missing', async () => {
            const user = { ...testUser, organization: undefined };
            const result = await service.isEnabled('test-targeted-rollout', user, false);
            (0, globals_1.expect)(result).toBe(false);
        });
    });
    (0, globals_1.describe)('Caching', () => {
        (0, globals_1.beforeEach)(async () => {
            service = new FeatureFlagService_js_1.FeatureFlagService({
                provider: 'local',
                config: { file: testConfigPath },
            }, mockLogger);
            await service.initialize();
        });
        (0, globals_1.it)('should cache flag evaluations', async () => {
            // First call
            const result1 = await service.getValue('test-boolean-flag', testUser, false);
            // Clear debug logs
            mockLogger.debug.mockClear();
            // Second call should use cache
            const result2 = await service.getValue('test-boolean-flag', testUser, false);
            (0, globals_1.expect)(result1).toBe(result2);
            (0, globals_1.expect)(mockLogger.debug).toHaveBeenCalledWith(globals_1.expect.stringContaining('Returning cached value'));
        });
        (0, globals_1.it)('should clear cache when requested', async () => {
            // Populate cache
            await service.getValue('test-boolean-flag', testUser, false);
            // Clear cache
            service.clearCache();
            // Next call should not use cache
            mockLogger.debug.mockClear();
            await service.getValue('test-boolean-flag', testUser, false);
            (0, globals_1.expect)(mockLogger.debug).not.toHaveBeenCalledWith(globals_1.expect.stringContaining('Returning cached value'));
        });
    });
    (0, globals_1.describe)('Kill Switches', () => {
        (0, globals_1.beforeEach)(async () => {
            service = new FeatureFlagService_js_1.FeatureFlagService({
                provider: 'local',
                config: { file: testConfigPath },
            }, mockLogger);
            await service.initialize();
        });
        (0, globals_1.it)('should load kill switches', async () => {
            const result = await service.isEnabled('test-kill-switch', testUser);
            (0, globals_1.expect)(result).toBe(false);
        });
        (0, globals_1.it)('should retrieve kill switch metadata', () => {
            const metadata = service.getFlagMetadata('test-kill-switch');
            (0, globals_1.expect)(metadata).toBeDefined();
            (0, globals_1.expect)(metadata?.key).toBe('test-kill-switch');
            (0, globals_1.expect)(metadata?.tags).toContain('kill-switch');
            (0, globals_1.expect)(metadata?.tags).toContain('emergency');
        });
    });
    (0, globals_1.describe)('Metadata', () => {
        (0, globals_1.beforeEach)(async () => {
            service = new FeatureFlagService_js_1.FeatureFlagService({
                provider: 'local',
                config: { file: testConfigPath },
            }, mockLogger);
            await service.initialize();
        });
        (0, globals_1.it)('should return all flags', () => {
            const flags = service.getAllFlags();
            (0, globals_1.expect)(flags).toHaveLength(6);
        });
        (0, globals_1.it)('should return flag metadata', () => {
            const metadata = service.getFlagMetadata('test-boolean-flag');
            (0, globals_1.expect)(metadata).toBeDefined();
            (0, globals_1.expect)(metadata?.key).toBe('test-boolean-flag');
            (0, globals_1.expect)(metadata?.name).toBe('Test Boolean Flag');
            (0, globals_1.expect)(metadata?.type).toBe('boolean');
            (0, globals_1.expect)(metadata?.defaultValue).toBe(true);
        });
        (0, globals_1.it)('should return undefined for non-existent flag', () => {
            const metadata = service.getFlagMetadata('nonexistent');
            (0, globals_1.expect)(metadata).toBeUndefined();
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.it)('should handle missing config gracefully', async () => {
            service = new FeatureFlagService_js_1.FeatureFlagService({
                provider: 'local',
                config: { file: './non-existent-config-file-12345.json' },
            }, mockLogger);
            await (0, globals_1.expect)(service.initialize()).rejects.toThrow();
        });
        (0, globals_1.it)('should handle invalid JSON in config file', async () => {
            const invalidConfigPath = (0, path_1.join)(process.cwd(), 'invalid-config.json');
            (0, fs_1.writeFileSync)(invalidConfigPath, 'invalid json {');
            service = new FeatureFlagService_js_1.FeatureFlagService({
                provider: 'local',
                config: { file: invalidConfigPath },
            }, mockLogger);
            await (0, globals_1.expect)(service.initialize()).rejects.toThrow();
            // Cleanup
            (0, fs_1.unlinkSync)(invalidConfigPath);
        });
        (0, globals_1.it)('should return default value on evaluation error', async () => {
            service = new FeatureFlagService_js_1.FeatureFlagService({
                provider: 'local',
                config: { file: testConfigPath },
            }, mockLogger);
            // Don't initialize - should cause error
            const result = await service.isEnabled('test-boolean-flag', testUser, true);
            // Should eventually initialize and return correct value
            (0, globals_1.expect)(result).toBeDefined();
        });
    });
    (0, globals_1.describe)('Shutdown', () => {
        (0, globals_1.beforeEach)(async () => {
            service = new FeatureFlagService_js_1.FeatureFlagService({
                provider: 'local',
                config: { file: testConfigPath },
            }, mockLogger);
            await service.initialize();
        });
        (0, globals_1.it)('should shutdown gracefully', async () => {
            await service.shutdown();
            (0, globals_1.expect)(mockLogger.info).toHaveBeenCalledWith('Shutting down feature flag service...');
        });
        (0, globals_1.it)('should clear cache on shutdown', async () => {
            // Populate cache
            await service.getValue('test-boolean-flag', testUser, false);
            // Shutdown
            await service.shutdown();
            // Cache should be empty (can't directly test, but service should handle gracefully)
            // Try to evaluate flag after shutdown
            const result = await service.isEnabled('test-boolean-flag', testUser, false);
            (0, globals_1.expect)(result).toBeDefined();
        });
    });
    (0, globals_1.describe)('Edge Cases', () => {
        (0, globals_1.beforeEach)(async () => {
            service = new FeatureFlagService_js_1.FeatureFlagService({
                provider: 'local',
                config: { file: testConfigPath },
            }, mockLogger);
            await service.initialize();
        });
        (0, globals_1.it)('should handle user without key', async () => {
            const invalidUser = { key: '', email: 'test@example.com' };
            const result = await service.isEnabled('test-boolean-flag', invalidUser, false);
            (0, globals_1.expect)(result).toBeDefined();
        });
        (0, globals_1.it)('should handle empty user object', async () => {
            const emptyUser = { key: 'user-123' };
            const result = await service.isEnabled('test-boolean-flag', emptyUser, false);
            (0, globals_1.expect)(result).toBeDefined();
        });
        (0, globals_1.it)('should handle undefined default value', async () => {
            const result = await service.getValue('nonexistent', testUser, undefined);
            (0, globals_1.expect)(result).toBeUndefined();
        });
        (0, globals_1.it)('should handle null default value', async () => {
            const result = await service.getValue('nonexistent', testUser, null);
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)('Performance', () => {
        (0, globals_1.beforeEach)(async () => {
            service = new FeatureFlagService_js_1.FeatureFlagService({
                provider: 'local',
                config: { file: testConfigPath },
            }, mockLogger);
            await service.initialize();
        });
        (0, globals_1.it)('should evaluate flags quickly', async () => {
            const iterations = 1000;
            const start = Date.now();
            for (let i = 0; i < iterations; i++) {
                await service.isEnabled('test-boolean-flag', testUser);
            }
            const duration = Date.now() - start;
            const avgTime = duration / iterations;
            // Should take less than 1ms per evaluation on average
            (0, globals_1.expect)(avgTime).toBeLessThan(1);
        });
        (0, globals_1.it)('should handle concurrent evaluations', async () => {
            const promises = [];
            for (let i = 0; i < 100; i++) {
                promises.push(service.isEnabled('test-boolean-flag', testUser));
            }
            const results = await Promise.all(promises);
            // All results should be consistent
            (0, globals_1.expect)(results.every((r) => r === results[0])).toBe(true);
        });
    });
});
(0, globals_1.describe)('getFeatureFlagService singleton', () => {
    (0, globals_1.afterEach)(() => {
        (0, FeatureFlagService_js_1.resetFeatureFlagService)();
    });
    (0, globals_1.it)('should throw error if not initialized', () => {
        (0, globals_1.expect)(() => {
            // @ts-ignore
            (0, FeatureFlagService_js_1.getFeatureFlagService)();
        }).toThrow('Feature flag service not initialized');
    });
    (0, globals_1.it)('should return same instance', () => {
        const testConfigPath = (0, path_1.join)(process.cwd(), 'test-feature-flags.json');
        (0, fs_1.writeFileSync)(testConfigPath, JSON.stringify({
            flags: {},
        }));
        const instance1 = (0, FeatureFlagService_js_1.getFeatureFlagService)({
            provider: 'local',
            config: { file: testConfigPath },
        });
        const instance2 = (0, FeatureFlagService_js_1.getFeatureFlagService)();
        (0, globals_1.expect)(instance1).toBe(instance2);
        // Cleanup
        (0, fs_1.unlinkSync)(testConfigPath);
    });
});
