"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PluginSandbox_js_1 = require("./PluginSandbox.js");
describe('PluginResourceEnforcement', () => {
    let sandbox;
    let mockPlugin;
    let mockContext;
    const mockManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test',
        author: 'Test',
        category: 'custom',
        capabilities: ['access:external'],
        resources: {
            timeoutMs: 100, // Short timeout for testing
            apiCalls: 2,
            network: {
                domains: ['example.com'],
            },
        },
    };
    beforeEach(() => {
        sandbox = new PluginSandbox_js_1.PluginSandbox();
        mockContext = {
            tenantId: 'tenant-1',
            principal: { id: 'user-1', tenantId: 'tenant-1', roles: [], scopes: [], kind: 'user' },
            config: {},
            correlationId: 'test-corr-id',
            timestamp: new Date().toISOString(),
            log: {
                debug: globals_1.jest.fn(),
                info: globals_1.jest.fn(),
                warn: globals_1.jest.fn(),
                error: globals_1.jest.fn(),
            }
        };
        mockPlugin = {
            manifest: mockManifest,
            initialize: globals_1.jest.fn().mockResolvedValue(undefined),
            execute: globals_1.jest.fn(),
        };
    });
    test('should enforce timeout limits', async () => {
        // Plugin that sleeps longer than timeout
        mockPlugin.execute.mockImplementation(async () => {
            await new Promise((resolve) => setTimeout(resolve, 200));
            return { success: true };
        });
        const result = await sandbox.execute(mockPlugin, 'test', {}, mockContext);
        expect(result.success).toBe(false);
        expect(result.error).toContain('timed out');
    });
    test('should enforce API call limits', async () => {
        mockPlugin.execute.mockImplementation(async (action, params, ctx) => {
            // Try to make 3 calls (limit is 2)
            try {
                await ctx.fetch('https://example.com');
                await ctx.fetch('https://example.com');
                await ctx.fetch('https://example.com');
                return { success: true };
            }
            catch (e) {
                return { success: false, error: e.message };
            }
        });
        // Mock fetch globally for this test context or ensure sandbox injects a mock
        // Since sandbox uses global fetch, we need to mock it
        global.fetch = globals_1.jest.fn().mockResolvedValue({ json: () => ({}) });
        const result = await sandbox.execute(mockPlugin, 'test', {}, mockContext);
        expect(result.success).toBe(false);
        expect(result.error).toContain('API call limit exceeded');
    });
    test('should enforce domain allowlist', async () => {
        mockPlugin.execute.mockImplementation(async (action, params, ctx) => {
            try {
                await ctx.fetch('https://evil.com');
                return { success: true };
            }
            catch (e) {
                return { success: false, error: e.message };
            }
        });
        global.fetch = globals_1.jest.fn().mockResolvedValue({ json: () => ({}) });
        const result = await sandbox.execute(mockPlugin, 'test', {}, mockContext);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Domain not allowed');
    });
});
