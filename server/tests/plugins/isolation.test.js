"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const service_1 = require("../../src/marketplace/service");
const index_1 = require("../../src/plugins/index");
const types_1 = require("../../src/marketplace/types");
const crypto_1 = require("crypto");
// Mock dependencies
globals_1.jest.mock('../../src/vault/helpers', () => ({
    vaultReadKvV2: globals_1.jest.fn(),
}));
globals_1.jest.mock('../../src/cache/redis.js', () => ({
    RedisService: globals_1.jest.fn().mockImplementation(() => ({
        get: globals_1.jest.fn(),
        set: globals_1.jest.fn(),
    })),
}));
globals_1.jest.mock('../../src/metrics/pluginMetrics.js', () => ({
    pluginInvocations: {
        labels: () => ({ inc: globals_1.jest.fn() }),
    },
    pluginErrors: {
        labels: () => ({ inc: globals_1.jest.fn() }),
    },
}));
globals_1.jest.mock('../../src/middleware/observability/otel-tracing.js', () => ({
    otelService: {
        createSpan: () => ({
            setAttribute: globals_1.jest.fn(),
            recordException: globals_1.jest.fn(),
            end: globals_1.jest.fn(),
        }),
    },
}));
(0, globals_1.describe)('Plugin Sandbox & Marketplace Isolation', () => {
    const marketplace = service_1.MarketplaceService.getInstance();
    const testPluginId = 'test-plugin-' + (0, crypto_1.randomUUID)();
    // Helper to create a package
    const createPackage = (code, capabilities = []) => ({
        manifest: {
            id: testPluginId,
            version: '1.0.0',
            name: 'Test Plugin',
            description: 'Test',
            capabilities: capabilities,
            entryPoint: 'index.js',
            trustTier: types_1.TrustTier.PARTNER,
            author: 'Tester'
        },
        code,
        signature: 'valid-sig' // mocked
    });
    (0, globals_1.beforeEach)(() => {
        // Reset state if needed, though Marketplace is singleton
        // We should ensure kill switch is off
        marketplace.disableKillSwitch('test-setup');
    });
    test('Should execute valid plugin with no side effects', async () => {
        const pkg = createPackage(`return inputs.x + 1;`);
        await marketplace.submitPlugin(pkg, 'tester');
        await marketplace.reviewPlugin(testPluginId, 'reviewer', 'APPROVE_FOR_TESTING');
        await marketplace.approvePlugin(testPluginId, 'approver');
        const result = await (0, index_1.runPlugin)(testPluginId, { x: 1 });
        (0, globals_1.expect)(result).toBe(2);
    });
    test('Should fail if plugin attempts network access without capability', async () => {
        const pkg = createPackage(`return await fetch('https://google.com');`);
        const id = 'network-fail-' + (0, crypto_1.randomUUID)();
        pkg.manifest.id = id;
        await marketplace.submitPlugin(pkg, 'tester');
        await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
        await marketplace.approvePlugin(id, 'approver');
        await (0, globals_1.expect)((0, index_1.runPlugin)(id, {})).rejects.toThrow(); // Should throw capability missing error
    });
    test('Should allow network access with capability', async () => {
        // Mock global fetch for the test runner environment
        const originalFetch = global.fetch;
        global.fetch = globals_1.jest.fn(() => Promise.resolve('ok'));
        const pkg = createPackage(`return await fetch('https://google.com');`, [{ type: 'network.outbound' }]);
        const id = 'network-pass-' + (0, crypto_1.randomUUID)();
        pkg.manifest.id = id;
        await marketplace.submitPlugin(pkg, 'tester');
        await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
        await marketplace.approvePlugin(id, 'approver');
        const result = await (0, index_1.runPlugin)(id, {});
        (0, globals_1.expect)(result).toBe('ok');
        global.fetch = originalFetch;
    });
    test('Should fail if plugin attempts to access process.env', async () => {
        const pkg = createPackage(`return process.env.SECRET;`);
        const id = 'env-fail-' + (0, crypto_1.randomUUID)();
        pkg.manifest.id = id;
        await marketplace.submitPlugin(pkg, 'tester');
        await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
        await marketplace.approvePlugin(id, 'approver');
        // In a strict VM, process should not be defined or should be limited
        await (0, globals_1.expect)((0, index_1.runPlugin)(id, {})).rejects.toThrow();
    });
    test('Should fail if execution times out', async () => {
        const pkg = createPackage(`while(true) {}`);
        const id = 'timeout-fail-' + (0, crypto_1.randomUUID)();
        pkg.manifest.id = id;
        await marketplace.submitPlugin(pkg, 'tester');
        await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
        await marketplace.approvePlugin(id, 'approver');
        await (0, globals_1.expect)((0, index_1.runPlugin)(id, {})).rejects.toThrow(/timed out/);
    });
    test('Should not run if not approved', async () => {
        const pkg = createPackage(`return 1;`);
        const id = 'unapproved-' + (0, crypto_1.randomUUID)();
        pkg.manifest.id = id;
        await marketplace.submitPlugin(pkg, 'tester');
        // Only submitted, not approved
        await (0, globals_1.expect)((0, index_1.runPlugin)(id, {})).rejects.toThrow(/not approved/);
    });
    test('Should not run any plugin if global kill switch is active', async () => {
        const pkg = createPackage(`return 1;`);
        const id = 'kill-switch-test-' + (0, crypto_1.randomUUID)();
        pkg.manifest.id = id;
        await marketplace.submitPlugin(pkg, 'tester');
        await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
        await marketplace.approvePlugin(id, 'approver');
        // Activate Kill Switch
        marketplace.enableKillSwitch('Test Emergency', 'admin');
        await (0, globals_1.expect)((0, index_1.runPlugin)(id, {})).rejects.toThrow(/Global Kill Switch/);
        // Deactivate
        marketplace.disableKillSwitch('admin');
        const result = await (0, index_1.runPlugin)(id, { x: 1 });
        (0, globals_1.expect)(result).toBe(1);
    });
});
