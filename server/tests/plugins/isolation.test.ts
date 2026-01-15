import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { MarketplaceService } from '../../src/marketplace/service';
import { runPlugin } from '../../src/plugins/index';
import { PluginStatus, PluginPackage, PluginManifest } from '../../src/plugins/types';
import { TrustTier } from '../../src/marketplace/types';
import { randomUUID } from 'crypto';

// Mock dependencies
jest.mock('../../src/vault/helpers', () => ({
  vaultReadKvV2: jest.fn(),
}));

jest.mock('../../src/cache/redis.js', () => ({
  RedisService: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

jest.mock('../../src/metrics/pluginMetrics.js', () => ({
  pluginInvocations: {
    labels: () => ({ inc: jest.fn() }),
  },
  pluginErrors: {
    labels: () => ({ inc: jest.fn() }),
  },
}));

jest.mock('../../src/middleware/observability/otel-tracing.js', () => ({
  otelService: {
    createSpan: () => ({
      setAttribute: jest.fn(),
      recordException: jest.fn(),
      end: jest.fn(),
    }),
  },
}));

describe('Plugin Sandbox & Marketplace Isolation', () => {
  const marketplace = MarketplaceService.getInstance();
  const testPluginId = 'test-plugin-' + randomUUID();

  // Helper to create a package
  const createPackage = (code: string, capabilities: any[] = []): PluginPackage => ({
    manifest: {
      id: testPluginId,
      version: '1.0.0',
      name: 'Test Plugin',
      description: 'Test',
      capabilities: capabilities,
      entryPoint: 'index.js',
      trustTier: TrustTier.PARTNER,
      author: 'Tester'
    },
    code,
    signature: 'valid-sig' // mocked
  });

  beforeEach(() => {
    // Reset state if needed, though Marketplace is singleton
    // We should ensure kill switch is off
    marketplace.disableKillSwitch('test-setup');
  });

  test('Should execute valid plugin with no side effects', async () => {
    const pkg = createPackage(`return inputs.x + 1;`);

    await marketplace.submitPlugin(pkg, 'tester');
    await marketplace.reviewPlugin(testPluginId, 'reviewer', 'APPROVE_FOR_TESTING');
    await marketplace.approvePlugin(testPluginId, 'approver');

    const result = await runPlugin(testPluginId, { x: 1 });
    expect(result).toBe(2);
  });

  test('Should fail if plugin attempts network access without capability', async () => {
    const pkg = createPackage(`return await fetch('https://google.com');`);

    const id = 'network-fail-' + randomUUID();
    pkg.manifest.id = id;

    await marketplace.submitPlugin(pkg, 'tester');
    await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
    await marketplace.approvePlugin(id, 'approver');

    await expect(runPlugin(id, {})).rejects.toThrow(); // Should throw capability missing error
  });

  test('Should allow network access with capability', async () => {
    // Mock global fetch for the test runner environment
    const originalFetch = global.fetch;
    global.fetch = jest.fn(() => Promise.resolve('ok')) as unknown as typeof fetch;

    const pkg = createPackage(`return await fetch('https://google.com');`, [{ type: 'network.outbound' }]);
    const id = 'network-pass-' + randomUUID();
    pkg.manifest.id = id;

    await marketplace.submitPlugin(pkg, 'tester');
    await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
    await marketplace.approvePlugin(id, 'approver');

    const result = await runPlugin(id, {});
    expect(result).toBe('ok');

    global.fetch = originalFetch;
  });

  test('Should fail if plugin attempts to access process.env', async () => {
    const pkg = createPackage(`return process.env.SECRET;`);
    const id = 'env-fail-' + randomUUID();
    pkg.manifest.id = id;

    await marketplace.submitPlugin(pkg, 'tester');
    await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
    await marketplace.approvePlugin(id, 'approver');

    // In a strict VM, process should not be defined or should be limited
    await expect(runPlugin(id, {})).rejects.toThrow();
  });

  test('Should fail if execution times out', async () => {
    const pkg = createPackage(`while(true) {}`);
    const id = 'timeout-fail-' + randomUUID();
    pkg.manifest.id = id;

    await marketplace.submitPlugin(pkg, 'tester');
    await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
    await marketplace.approvePlugin(id, 'approver');

    await expect(runPlugin(id, {})).rejects.toThrow(/timed out/);
  });

  test('Should not run if not approved', async () => {
    const pkg = createPackage(`return 1;`);
    const id = 'unapproved-' + randomUUID();
    pkg.manifest.id = id;

    await marketplace.submitPlugin(pkg, 'tester');
    // Only submitted, not approved

    await expect(runPlugin(id, {})).rejects.toThrow(/not approved/);
  });

  test('Should not run any plugin if global kill switch is active', async () => {
    const pkg = createPackage(`return 1;`);
    const id = 'kill-switch-test-' + randomUUID();
    pkg.manifest.id = id;

    await marketplace.submitPlugin(pkg, 'tester');
    await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
    await marketplace.approvePlugin(id, 'approver');

    // Activate Kill Switch
    marketplace.enableKillSwitch('Test Emergency', 'admin');

    await expect(runPlugin(id, {})).rejects.toThrow(/Global Kill Switch/);

    // Deactivate
    marketplace.disableKillSwitch('admin');
    const result = await runPlugin(id, { x: 1 });
    expect(result).toBe(1);
  });
});
