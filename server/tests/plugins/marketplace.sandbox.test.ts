import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MarketplaceService } from '../../src/marketplace/service';
import { runPlugin } from '../../src/plugins/index';
import { PluginStatus, PluginPackage, PluginManifest } from '../../src/plugins/types';
import { TrustTier } from '../../src/marketplace/types';
import { randomUUID } from 'crypto';

// Mocks
const mockVault = { read: async () => ({}) };
const mockCache = { get: async () => null, set: async () => {} };
const mockMetrics = {
  invocations: { labels: () => ({ inc: () => {} }) },
  errors: { labels: () => ({ inc: () => {} }) },
};
const mockTracer = {
  createSpan: () => ({
    setAttribute: () => {},
    recordException: () => {},
    end: () => {},
  }),
};

const dependencies = {
    vault: mockVault,
    cache: mockCache,
    metrics: mockMetrics,
    tracer: mockTracer
};

describe('Plugin Sandbox & Marketplace Isolation (Node Test)', () => {
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
    // Reset kill switch
    marketplace.disableKillSwitch('test-setup');
  });

  test('Should execute valid plugin with no side effects', async () => {
    const pkg = createPackage(`return inputs.x + 1;`);

    await marketplace.submitPlugin(pkg, 'tester');
    await marketplace.reviewPlugin(testPluginId, 'reviewer', 'APPROVE_FOR_TESTING');
    await marketplace.approvePlugin(testPluginId, 'approver');

    const result = await runPlugin(testPluginId, { x: 1 }, { dependencies });
    assert.strictEqual(result, 2);
  });

  test('Should fail if plugin attempts network access without capability', async () => {
    const pkg = createPackage(`return await fetch('https://google.com');`);

    const id = 'network-fail-' + randomUUID();
    pkg.manifest.id = id;

    await marketplace.submitPlugin(pkg, 'tester');
    await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
    await marketplace.approvePlugin(id, 'approver');

    await assert.rejects(
        async () => await runPlugin(id, {}, { dependencies }),
        { message: "Capability 'network.outbound' missing" }
    );
  });

  test('Should allow network access with capability', async () => {
    // Mock global fetch
    const originalFetch = global.fetch;
    global.fetch = async () => 'ok' as any;

    const pkg = createPackage(`return await fetch('https://google.com');`, [{ type: 'network.outbound' }]);
    const id = 'network-pass-' + randomUUID();
    pkg.manifest.id = id;

    await marketplace.submitPlugin(pkg, 'tester');
    await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
    await marketplace.approvePlugin(id, 'approver');

    const result = await runPlugin(id, {}, { dependencies });
    assert.strictEqual(result, 'ok');

    global.fetch = originalFetch;
  });

  test('Should fail if plugin attempts to access process.env', async () => {
    const pkg = createPackage(`return process.env.SECRET;`);
    const id = 'env-fail-' + randomUUID();
    pkg.manifest.id = id;

    await marketplace.submitPlugin(pkg, 'tester');
    await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
    await marketplace.approvePlugin(id, 'approver');

    await assert.rejects(
        async () => await runPlugin(id, {}, { dependencies }),
        /process is not defined/
    );
  });

  test('Should fail if execution times out', async () => {
    const pkg = createPackage(`while(true) {}`);
    const id = 'timeout-fail-' + randomUUID();
    pkg.manifest.id = id;

    await marketplace.submitPlugin(pkg, 'tester');
    await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
    await marketplace.approvePlugin(id, 'approver');

    await assert.rejects(
        async () => await runPlugin(id, {}, { dependencies }),
        /timed out/
    );
  });

  test('Should not run if not approved', async () => {
    const pkg = createPackage(`return 1;`);
    const id = 'unapproved-' + randomUUID();
    pkg.manifest.id = id;

    await marketplace.submitPlugin(pkg, 'tester');
    // Only submitted, not approved

    await assert.rejects(
        async () => await runPlugin(id, {}, { dependencies }),
        /not approved/
    );
  });

  test('Should not run any plugin if global kill switch is active', async () => {
    // Create package with unique ID for kill switch test
    const id = 'kill-switch-test-' + randomUUID();
    const pkg = createPackage(`return inputs.x + 1;`); // Corrected code to match expectation
    pkg.manifest.id = id;

    await marketplace.submitPlugin(pkg, 'tester');
    await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
    await marketplace.approvePlugin(id, 'approver');

    // Activate Kill Switch
    marketplace.enableKillSwitch('Test Emergency', 'admin');

    await assert.rejects(
        async () => await runPlugin(id, { x: 1 }, { dependencies }),
        /Global Kill Switch/
    );

    // Deactivate
    marketplace.disableKillSwitch('admin');
    const result = await runPlugin(id, { x: 1 }, { dependencies });
    assert.strictEqual(result, 2);
  });
});
