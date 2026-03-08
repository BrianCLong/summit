"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crudResolvers_js_1 = require("../src/graphql/resolvers/crudResolvers.js");
const globals_1 = require("@jest/globals");
let session;
globals_1.jest.mock('../src/config/database.js', () => ({
    getNeo4jDriver: () => ({ session: () => session }),
    getPostgresPool: () => ({ query: globals_1.jest.fn() }),
    getRedisClient: () => ({
        get: globals_1.jest.fn(),
        set: globals_1.jest.fn(),
        sadd: globals_1.jest.fn(),
        smembers: globals_1.jest.fn(),
        del: globals_1.jest.fn(),
    }),
}));
(0, globals_1.describe)('graphData filtering', () => {
    (0, globals_1.beforeEach)(() => {
        session = { run: globals_1.jest.fn(), close: globals_1.jest.fn() };
    });
    (0, globals_1.test)('applies confidence, tag, and time filters', async () => {
        const nodeRecords = [
            {
                get: () => ({
                    properties: {
                        id: '1',
                        confidence: 0.9,
                        createdAt: '2024-01-01T00:00:00.000Z',
                        customMetadata: JSON.stringify({ tags: ['keep'] }),
                    },
                }),
            },
            {
                get: () => ({
                    properties: {
                        id: '2',
                        confidence: 0.5,
                        createdAt: '2024-01-01T00:00:00.000Z',
                        customMetadata: JSON.stringify({ tags: ['drop'] }),
                    },
                }),
            },
        ];
        const edgeRecord = {
            get: (key) => {
                if (key === 'r')
                    return {
                        properties: {
                            id: 'e1',
                            confidence: 0.95,
                            createdAt: '2024-01-01T00:00:00.000Z',
                            customMetadata: JSON.stringify({ tags: ['keep'] }),
                        },
                    };
                if (key === 'from')
                    return { properties: nodeRecords[0].get().properties };
                return { properties: nodeRecords[1].get().properties };
            },
        };
        session.run
            .mockResolvedValueOnce({ records: nodeRecords })
            .mockResolvedValueOnce({ records: [edgeRecord] });
        const result = await crudResolvers_js_1.crudResolvers.Query.graphData(null, {
            investigationId: 'inv1',
            filter: {
                minConfidence: 0.8,
                tags: ['keep'],
                startDate: '2023-12-01T00:00:00.000Z',
                endDate: '2024-12-31T00:00:00.000Z',
            },
        }, { user: { id: 'u1' } });
        (0, globals_1.expect)(result.nodes).toHaveLength(1);
        (0, globals_1.expect)(result.nodes[0].id).toBe('1');
        (0, globals_1.expect)(result.edges).toHaveLength(0);
    });
});
