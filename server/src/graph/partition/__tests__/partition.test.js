"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ShardManager_js_1 = require("../ShardManager.js");
const GraphRouter_js_1 = require("../GraphRouter.js");
const PartitionStrategy_js_1 = require("../PartitionStrategy.js");
// Mock Neo4j driver
globals_1.jest.mock('neo4j-driver', () => ({
    driver: globals_1.jest.fn(() => ({
        verifyConnectivity: globals_1.jest.fn(async () => true),
        session: globals_1.jest.fn(() => ({
            run: globals_1.jest.fn(async () => ({ records: [] })),
            close: globals_1.jest.fn(async () => undefined),
        })),
        close: globals_1.jest.fn(async () => undefined),
    })),
    auth: {
        basic: globals_1.jest.fn(),
    },
}));
(0, globals_1.describe)('Edge-Scale Graph Partitioning', () => {
    let shardManager;
    (0, globals_1.beforeEach)(async () => {
        // Reset singleton if possible, or just re-register
        // Since it's a private constructor singleton, we can't easily reset it without
        // adding a reset method or accessing private instance.
        // Ideally we add a _resetForTesting method.
        // For now we assume fresh state or handle collisions.
        shardManager = ShardManager_js_1.ShardManager.getInstance();
        await shardManager.closeAll();
    });
    (0, globals_1.afterEach)(async () => {
        await shardManager.closeAll();
    });
    (0, globals_1.it)('should register shards correctly', async () => {
        await shardManager.registerShard({
            id: 'shard-1',
            uri: 'bolt://localhost:7687',
            region: 'us-east'
        });
        (0, globals_1.expect)(shardManager.getDriver('shard-1')).toBeDefined();
        (0, globals_1.expect)(shardManager.getAllShards()).toContain('shard-1');
    });
    (0, globals_1.it)('should route based on region locality', async () => {
        await shardManager.registerShard({
            id: 'us-shard',
            uri: 'bolt://us:7687',
            region: 'us-east'
        });
        await shardManager.registerShard({
            id: 'eu-shard',
            uri: 'bolt://eu:7687',
            region: 'eu-west'
        });
        const strategy = new PartitionStrategy_js_1.LocalityAwarePartitionStrategy(new Map([
            ['us-east', 'us-shard'],
            ['eu-west', 'eu-shard']
        ]));
        const router = new GraphRouter_js_1.GraphRouter(strategy);
        // Mock the drivers to verify calls
        const usDriver = shardManager.getDriver('us-shard');
        const euDriver = shardManager.getDriver('eu-shard');
        // We can't easily spy on the mocked driver instances created inside ShardManager
        // without more complex mocking, but we can verify the Strategy resolution logic.
        const shardA = strategy.resolveShard({ region: 'us-east' });
        (0, globals_1.expect)(shardA).toBe('us-shard');
        const shardB = strategy.resolveShard({ region: 'eu-west' });
        (0, globals_1.expect)(shardB).toBe('eu-shard');
    });
    (0, globals_1.it)('should fallback to hashing if no region provided', async () => {
        await shardManager.registerShard({
            id: 'shard-1',
            uri: 'bolt://1:7687',
            region: 'r1'
        });
        await shardManager.registerShard({
            id: 'shard-2',
            uri: 'bolt://2:7687',
            region: 'r2'
        });
        const strategy = new PartitionStrategy_js_1.LocalityAwarePartitionStrategy(new Map());
        const s1 = strategy.resolveShard({ tenantId: 'tenant-a' });
        const s2 = strategy.resolveShard({ tenantId: 'tenant-a' }); // Should be deterministic
        (0, globals_1.expect)(s1).toBe(s2);
        (0, globals_1.expect)(['shard-1', 'shard-2']).toContain(s1);
    });
});
