"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const globals_1 = require("@jest/globals");
const service_1 = require("../../src/marketplace/service");
const index_1 = require("../../src/plugins/index");
const types_1 = require("../../src/marketplace/types");
const crypto_1 = require("crypto");
// Mocks
const mockVault = { read: async () => ({}) };
const mockCache = { get: async () => null, set: async () => { } };
const mockMetrics = {
    invocations: { labels: () => ({ inc: () => { } }) },
    errors: { labels: () => ({ inc: () => { } }) },
};
const mockTracer = {
    createSpan: () => ({
        setAttribute: () => { },
        recordException: () => { },
        end: () => { },
    }),
};
const dependencies = {
    vault: mockVault,
    cache: mockCache,
    metrics: mockMetrics,
    tracer: mockTracer,
};
const isJest = Boolean(process.env.JEST_WORKER_ID);
if (isJest) {
    (0, globals_1.describe)('Plugin Sandbox & Marketplace Isolation (Node Test)', () => {
        (0, globals_1.it)('skipped under jest', () => {
            (0, globals_1.expect)(true).toBe(true);
        });
    });
}
else {
    (0, node_test_1.describe)('Plugin Sandbox & Marketplace Isolation (Node Test)', () => {
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
        (0, node_test_1.beforeEach)(() => {
            // Reset kill switch
            marketplace.disableKillSwitch('test-setup');
        });
        (0, node_test_1.test)('Should execute valid plugin with no side effects', async () => {
            const pkg = createPackage(`return inputs.x + 1;`);
            await marketplace.submitPlugin(pkg, 'tester');
            await marketplace.reviewPlugin(testPluginId, 'reviewer', 'APPROVE_FOR_TESTING');
            await marketplace.approvePlugin(testPluginId, 'approver');
            const result = await (0, index_1.runPlugin)(testPluginId, { x: 1 }, { dependencies });
            node_assert_1.default.strictEqual(result, 2);
        });
        (0, node_test_1.test)('Should fail if plugin attempts network access without capability', async () => {
            const pkg = createPackage(`return await fetch('https://google.com');`);
            const id = 'network-fail-' + (0, crypto_1.randomUUID)();
            pkg.manifest.id = id;
            await marketplace.submitPlugin(pkg, 'tester');
            await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
            await marketplace.approvePlugin(id, 'approver');
            await node_assert_1.default.rejects(async () => await (0, index_1.runPlugin)(id, {}, { dependencies }), { message: "Capability 'network.outbound' missing" });
        });
        (0, node_test_1.test)('Should allow network access with capability', async () => {
            // Mock global fetch
            const originalFetch = global.fetch;
            global.fetch = async () => 'ok';
            const pkg = createPackage(`return await fetch('https://google.com');`, [{ type: 'network.outbound' }]);
            const id = 'network-pass-' + (0, crypto_1.randomUUID)();
            pkg.manifest.id = id;
            await marketplace.submitPlugin(pkg, 'tester');
            await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
            await marketplace.approvePlugin(id, 'approver');
            const result = await (0, index_1.runPlugin)(id, {}, { dependencies });
            node_assert_1.default.strictEqual(result, 'ok');
            global.fetch = originalFetch;
        });
        (0, node_test_1.test)('Should fail if plugin attempts to access process.env', async () => {
            const pkg = createPackage(`return process.env.SECRET;`);
            const id = 'env-fail-' + (0, crypto_1.randomUUID)();
            pkg.manifest.id = id;
            await marketplace.submitPlugin(pkg, 'tester');
            await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
            await marketplace.approvePlugin(id, 'approver');
            await node_assert_1.default.rejects(async () => await (0, index_1.runPlugin)(id, {}, { dependencies }), /process is not defined/);
        });
        (0, node_test_1.test)('Should fail if execution times out', async () => {
            const pkg = createPackage(`while(true) {}`);
            const id = 'timeout-fail-' + (0, crypto_1.randomUUID)();
            pkg.manifest.id = id;
            await marketplace.submitPlugin(pkg, 'tester');
            await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
            await marketplace.approvePlugin(id, 'approver');
            await node_assert_1.default.rejects(async () => await (0, index_1.runPlugin)(id, {}, { dependencies }), /timed out/);
        });
        (0, node_test_1.test)('Should not run if not approved', async () => {
            const pkg = createPackage(`return 1;`);
            const id = 'unapproved-' + (0, crypto_1.randomUUID)();
            pkg.manifest.id = id;
            await marketplace.submitPlugin(pkg, 'tester');
            // Only submitted, not approved
            await node_assert_1.default.rejects(async () => await (0, index_1.runPlugin)(id, {}, { dependencies }), /not approved/);
        });
        (0, node_test_1.test)('Should not run any plugin if global kill switch is active', async () => {
            // Create package with unique ID for kill switch test
            const id = 'kill-switch-test-' + (0, crypto_1.randomUUID)();
            const pkg = createPackage(`return inputs.x + 1;`); // Corrected code to match expectation
            pkg.manifest.id = id;
            await marketplace.submitPlugin(pkg, 'tester');
            await marketplace.reviewPlugin(id, 'reviewer', 'APPROVE_FOR_TESTING');
            await marketplace.approvePlugin(id, 'approver');
            // Activate Kill Switch
            marketplace.enableKillSwitch('Test Emergency', 'admin');
            await node_assert_1.default.rejects(async () => await (0, index_1.runPlugin)(id, { x: 1 }, { dependencies }), /Global Kill Switch/);
            // Deactivate
            marketplace.disableKillSwitch('admin');
            const result = await (0, index_1.runPlugin)(id, { x: 1 }, { dependencies });
            node_assert_1.default.strictEqual(result, 2);
        });
    });
}
