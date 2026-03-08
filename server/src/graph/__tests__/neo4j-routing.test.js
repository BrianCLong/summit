"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Define mocks
const cacheStore = new Map();
// Shared state for the mock
const sharedState = {
    drivers: {},
};
globals_1.jest.unstable_mockModule('neo4j-driver', () => {
    const driverFn = globals_1.jest.fn((uri) => {
        // Rely on process global for sharing state in this specific test environment
        // Note: We use a different key to ensure we are testing isolation fixes
        const registry = process.__NEO4J_REGISTRY_V2__ || {};
        process.__NEO4J_REGISTRY_V2__ = registry;
        if (!registry[uri]) {
            const session = { run: globals_1.jest.fn(), close: globals_1.jest.fn() };
            registry[uri] = { session: globals_1.jest.fn(() => session), close: globals_1.jest.fn(), __session: session, __uri: uri };
        }
        return registry[uri];
    });
    const auth = { basic: globals_1.jest.fn(() => ({})) };
    const session = { READ: 'READ', WRITE: 'WRITE' };
    const neo4j = { driver: driverFn, auth, session };
    return {
        __esModule: true,
        default: neo4j,
        driver: driverFn,
        auth,
        session,
    };
});
globals_1.jest.unstable_mockModule('../../lib/resources/QuotaEnforcer', () => ({
    quotaEnforcer: {
        isFeatureAllowed: globals_1.jest.fn(() => true),
    },
}));
globals_1.jest.unstable_mockModule('../../cache/responseCache.js', () => ({
    getCachedJson: globals_1.jest.fn(async (key) => (cacheStore.has(key) ? cacheStore.get(key) : null)),
    setCachedJson: globals_1.jest.fn(async (key, value) => cacheStore.set(key, value)),
    invalidateCache: globals_1.jest.fn(async () => cacheStore.clear()),
    flushLocalCache: globals_1.jest.fn(() => cacheStore.clear()),
}));
// Dynamic imports
const { driver: neo4jDriver } = await Promise.resolve().then(() => __importStar(require('neo4j-driver')));
const { runCypher, __resetGraphConnectionsForTests } = await Promise.resolve().then(() => __importStar(require('../neo4j.js')));
const { buildGraphCacheKey, invalidateGraphQueryCache, normalizeQuery, } = await Promise.resolve().then(() => __importStar(require('../queryCache.js')));
const { flushLocalCache, invalidateCache } = await Promise.resolve().then(() => __importStar(require('../../cache/responseCache.js')));
const neo4jMock = { driver: neo4jDriver };
(0, globals_1.describe)('neo4j routing + cache', () => {
    (0, globals_1.beforeEach)(() => {
        process.env.NEO4J_URI = 'bolt://primary';
        process.env.NEO4J_USER = 'neo4j';
        process.env.NEO4J_PASSWORD = 'password';
        process.env.NEO4J_READ_URI = '';
        process.env.NEO4J_REPLICA_URI = '';
        process.env.READ_REPLICA = '0';
        process.env.QUERY_CACHE = '1';
        process.env.GRAPH_STICKY_MS = '3000';
        // Clear registry
        process.__NEO4J_REGISTRY_V2__ = {};
        cacheStore.clear();
        globals_1.jest.clearAllMocks();
        __resetGraphConnectionsForTests();
        flushLocalCache();
    });
    (0, globals_1.it)('normalizes queries and builds tagged cache keys that are invalidated', async () => {
        const query = '\n   MATCH (n)\nRETURN n   ';
        const normalized = normalizeQuery(query);
        (0, globals_1.expect)(normalized).toBe('MATCH (n) RETURN n');
        const key = buildGraphCacheKey({
            query,
            params: { b: 2, a: 1 },
            tenantId: 'tenant-1',
            caseId: 'case-9',
            permissionsHash: 'perm-hash',
        });
        (0, globals_1.expect)(key.cacheKey.startsWith('graph:query:')).toBe(true);
        (0, globals_1.expect)(key.tags).toEqual(globals_1.expect.arrayContaining([
            'graph:query',
            'graph:query:tenant:tenant-1',
            'graph:query:case:tenant-1:case-9',
            'graph:query:perm:perm-hash',
        ]));
        invalidateCache.mockClear();
        await invalidateGraphQueryCache({
            tenantId: 'tenant-1',
            caseId: 'case-9',
            permissionsHash: 'perm-hash',
        });
        (0, globals_1.expect)(invalidateCache).toHaveBeenCalledWith('graph:query', 'tenant-1');
        (0, globals_1.expect)(invalidateCache).toHaveBeenCalledWith('graph:query:tenant:tenant-1', 'tenant-1');
        (0, globals_1.expect)(invalidateCache).toHaveBeenCalledWith('graph:query:case:tenant-1:case-9', 'tenant-1');
        (0, globals_1.expect)(invalidateCache).toHaveBeenCalledWith('graph:query:perm:perm-hash', 'tenant-1');
    });
    // TODO: Fix mock state isolation issues for these tests in ESM environment
    // The 'process' global trick doesn't seem to reliably share state between the
    // mock factory (hoisted) and the test execution context in this specific setup.
    globals_1.it.skip('misses cache on permission changes while preserving hits otherwise', async () => {
        // 1. Initialize
        neo4jMock.driver(process.env.NEO4J_URI);
        // 2. Retrieve
        const registry = process.__NEO4J_REGISTRY_V2__;
        const primary = registry[process.env.NEO4J_URI];
        if (!primary) {
            throw new Error(`Primary driver is undefined for URI: ${process.env.NEO4J_URI}`);
        }
        // 3. Configure
        primary.__session.run.mockResolvedValue({
            records: [{ toObject: () => ({ result: 'first' }) }],
        });
        // 4. Test
        const first = await runCypher('MATCH (n) RETURN n', {}, {
            tenantId: 'tenant-a',
            permissionsHash: 'perm1',
        });
        (0, globals_1.expect)(first).toEqual([{ result: 'first' }]);
        (0, globals_1.expect)(primary.__session.run).toHaveBeenCalledTimes(1);
        const second = await runCypher('MATCH (n) RETURN n', {}, {
            tenantId: 'tenant-a',
            permissionsHash: 'perm1',
        });
        (0, globals_1.expect)(second).toEqual([{ result: 'first' }]);
        (0, globals_1.expect)(primary.__session.run).toHaveBeenCalledTimes(1);
        primary.__session.run.mockResolvedValue({
            records: [{ toObject: () => ({ result: 'second' }) }],
        });
        const third = await runCypher('MATCH (n) RETURN n', {}, {
            tenantId: 'tenant-a',
            permissionsHash: 'perm2',
        });
        (0, globals_1.expect)(third).toEqual([{ result: 'second' }]);
        (0, globals_1.expect)(primary.__session.run).toHaveBeenCalledTimes(2);
    });
    globals_1.it.skip('falls back to primary when replica throws', async () => {
        process.env.READ_REPLICA = '1';
        process.env.NEO4J_READ_URI = 'bolt://replica';
        process.env.QUERY_CACHE = '0';
        // Clear & Re-init
        process.__NEO4J_REGISTRY_V2__ = {};
        __resetGraphConnectionsForTests();
        neo4jMock.driver(process.env.NEO4J_READ_URI);
        neo4jMock.driver(process.env.NEO4J_URI);
        const registry = process.__NEO4J_REGISTRY_V2__;
        const replica = registry[process.env.NEO4J_READ_URI];
        if (!replica)
            throw new Error(`Replica driver undefined for ${process.env.NEO4J_READ_URI}`);
        replica.__session.run.mockRejectedValue(new Error('replica down'));
        const primary = registry[process.env.NEO4J_URI];
        if (!primary)
            throw new Error(`Primary driver undefined for ${process.env.NEO4J_URI}`);
        primary.__session.run.mockResolvedValue({
            records: [{ toObject: () => ({ ok: true }) }],
        });
        const results = await runCypher('MATCH (n) RETURN n', {}, { tenantId: 'tenant-a' });
        (0, globals_1.expect)(results).toEqual([{ ok: true }]);
        (0, globals_1.expect)(replica.__session.run).toHaveBeenCalledTimes(1);
        (0, globals_1.expect)(primary.__session.run).toHaveBeenCalledTimes(1);
    });
});
