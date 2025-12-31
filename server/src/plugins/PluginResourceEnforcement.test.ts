
import { jest } from '@jest/globals';
import { PluginSandbox } from './PluginSandbox.js';
import { Plugin, PluginContext, PluginManifest } from './types/Plugin.js';

describe('PluginResourceEnforcement', () => {
  let sandbox: PluginSandbox;
  let mockPlugin: Plugin;
  let mockContext: PluginContext;

  const mockManifest: PluginManifest = {
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
    sandbox = new PluginSandbox();
    mockContext = {
      tenantId: 'tenant-1',
      principal: { id: 'user-1', tenantId: 'tenant-1', roles: [], scopes: [], kind: 'user' },
      config: {},
      correlationId: 'test-corr-id',
      timestamp: new Date().toISOString(),
      log: {
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
      } as any
    };

    mockPlugin = {
      manifest: mockManifest,
      initialize: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn(),
    };
  });

  test('should enforce timeout limits', async () => {
    // Plugin that sleeps longer than timeout
    (mockPlugin.execute as jest.Mock).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { success: true };
    });

    const result = await sandbox.execute(mockPlugin, 'test', {}, mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');
  });

  test('should enforce API call limits', async () => {
    (mockPlugin.execute as jest.Mock).mockImplementation(async (action, params, ctx: any) => {
        // Try to make 3 calls (limit is 2)
        try {
            await ctx.fetch('https://example.com');
            await ctx.fetch('https://example.com');
            await ctx.fetch('https://example.com');
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    });

    // Mock fetch globally for this test context or ensure sandbox injects a mock
    // Since sandbox uses global fetch, we need to mock it
    global.fetch = jest.fn().mockResolvedValue({ json: () => ({}) } as any);

    const result = await sandbox.execute(mockPlugin, 'test', {}, mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toContain('API call limit exceeded');
  });

  test('should enforce domain allowlist', async () => {
    (mockPlugin.execute as jest.Mock).mockImplementation(async (action, params, ctx: any) => {
        try {
            await ctx.fetch('https://evil.com');
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    });

    global.fetch = jest.fn().mockResolvedValue({ json: () => ({}) } as any);

    const result = await sandbox.execute(mockPlugin, 'test', {}, mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Domain not allowed');
  });
});
