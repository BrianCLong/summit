"use strict";
/**
 * Graph Client Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Use jest.unstable_mockModule for ESM
const mockQueryResult = {
    records: [
        {
            keys: ['n'],
            get: () => ({
                elementId: '4:test:123',
                labels: ['Person'],
                properties: { name: 'Test' },
            }),
        },
    ],
    summary: {
        resultAvailableAfter: { toNumber: () => 10 },
        resultConsumedAfter: { toNumber: () => 15 },
        counters: {
            updates: () => ({
                nodesCreated: 0,
                nodesDeleted: 0,
                relationshipsCreated: 0,
                relationshipsDeleted: 0,
                propertiesSet: 0,
                labelsAdded: 0,
                labelsRemoved: 0,
            }),
        },
        queryType: 'r',
    },
};
const mockSession = {
    run: async () => mockQueryResult,
    close: async () => undefined,
};
const mockDriverInstance = {
    verifyConnectivity: async () => undefined,
    close: async () => undefined,
    session: () => mockSession,
    getServerInfo: async () => ({ protocolVersion: 5.0 }),
};
const mockNeo4j = {
    driver: () => mockDriverInstance,
    auth: {
        basic: (user) => ({ scheme: 'basic', principal: user }),
    },
    session: {
        READ: 'READ',
        WRITE: 'WRITE',
    },
    int: (n) => ({ toNumber: () => n }),
    isInt: () => false,
    isNode: (val) => val && typeof val === 'object' && val !== null && 'labels' in val,
    isRelationship: (val) => val && typeof val === 'object' && val !== null && 'type' in val && 'startNodeElementId' in val,
    isPath: () => false,
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('neo4j-driver', () => ({
    __esModule: true,
    default: mockNeo4j,
    ...mockNeo4j,
}));
const graph_client_js_1 = require("../src/lib/graph-client.js");
(0, globals_1.describe)('GraphClient', () => {
    let client;
    (0, globals_1.beforeEach)(() => {
        client = new graph_client_js_1.GraphClient({
            uri: 'bolt://localhost:7687',
            user: 'neo4j',
            password: 'password',
            database: 'neo4j',
            encrypted: false,
        });
    });
    (0, globals_1.afterEach)(async () => {
        await client.disconnect();
    });
    (0, globals_1.describe)('connect', () => {
        (0, globals_1.it)('should connect to Neo4j', async () => {
            await (0, globals_1.expect)(client.connect()).resolves.not.toThrow();
        });
        (0, globals_1.it)('should not reconnect if already connected', async () => {
            await client.connect();
            await (0, globals_1.expect)(client.connect()).resolves.not.toThrow();
        });
    });
    (0, globals_1.describe)('query', () => {
        (0, globals_1.it)('should execute a Cypher query', async () => {
            const result = await client.query('MATCH (n) RETURN n LIMIT 1');
            (0, globals_1.expect)(result).toHaveProperty('columns');
            (0, globals_1.expect)(result).toHaveProperty('rows');
            (0, globals_1.expect)(result).toHaveProperty('summary');
            (0, globals_1.expect)(result).toHaveProperty('totalRows');
        });
        (0, globals_1.it)('should return query statistics', async () => {
            const result = await client.query('MATCH (n) RETURN n LIMIT 1');
            (0, globals_1.expect)(result.summary).toHaveProperty('resultAvailableAfter');
            (0, globals_1.expect)(result.summary).toHaveProperty('resultConsumedAfter');
            (0, globals_1.expect)(result.summary).toHaveProperty('counters');
        });
    });
    (0, globals_1.describe)('healthCheck', () => {
        (0, globals_1.it)('should return health status', async () => {
            const health = await client.healthCheck();
            (0, globals_1.expect)(health).toHaveProperty('connected');
            (0, globals_1.expect)(health).toHaveProperty('latencyMs');
            (0, globals_1.expect)(typeof health.connected).toBe('boolean');
            (0, globals_1.expect)(typeof health.latencyMs).toBe('number');
        });
    });
});
