"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const globals_1 = require("@jest/globals");
const queryMock = globals_1.jest.fn();
const transactionMock = globals_1.jest.fn();
globals_1.jest.mock('../../src/db/connection.js', () => ({
    __esModule: true,
    getDatabase: () => ({
        transaction: transactionMock,
    }),
}));
globals_1.jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));
// Import after mocks so the repository picks up the mocked database
// eslint-disable-next-line import/first
const IdentityClusterRepository_js_1 = require("../../src/db/IdentityClusterRepository.js");
(0, globals_1.describe)('IdentityClusterRepository.merge lock ordering', () => {
    const repo = new IdentityClusterRepository_js_1.IdentityClusterRepository();
    const now = new Date().toISOString();
    const makeRow = (overrides) => ({
        cluster_id: 'cluster-default',
        tenant_id: 'tenant-1',
        entity_type: 'Person',
        node_ids: ['a'],
        primary_node_id: 'a',
        canonical_attributes: [],
        edges: [],
        cohesion_score: 0.5,
        confidence: 0.6,
        merge_history: [],
        created_at: now,
        updated_at: now,
        version: 1,
        locked: false,
        locked_by: null,
        locked_at: null,
        locked_reason: null,
        ...overrides,
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        queryMock.mockReset();
        transactionMock.mockReset();
        transactionMock.mockImplementation(async (fn) => fn({ query: queryMock }));
    });
    (0, globals_1.it)('locks clusters in a deterministic order to prevent deadlocks', async () => {
        const targetId = 'cluster-b';
        const sourceId = 'cluster-a';
        const lockQueryResult = {
            rowCount: 2,
            command: 'SELECT',
            oid: 0,
            fields: [],
            rows: [makeRow({ cluster_id: sourceId }), makeRow({ cluster_id: targetId, node_ids: ['b'] })],
        };
        queryMock.mockResolvedValueOnce(lockQueryResult); // Lock acquisition
        queryMock.mockResolvedValueOnce({ rowCount: 1 }); // Update merged cluster
        queryMock.mockResolvedValueOnce({ rowCount: 1 }); // Delete source cluster
        queryMock.mockResolvedValue({ rowCount: 1 }); // Update nodes
        const merged = await repo.merge(targetId, sourceId, 'tester', 'harness');
        (0, globals_1.expect)(queryMock).toHaveBeenCalled();
        const [lockSql, lockParams] = queryMock.mock.calls[0] ?? [];
        (0, globals_1.expect)(String(lockSql)).toContain('ORDER BY cluster_id');
        (0, globals_1.expect)(lockParams?.[0]).toEqual([sourceId, targetId]); // Sorted array despite reversed input
        (0, globals_1.expect)(merged.clusterId).toBe(targetId);
        (0, globals_1.expect)(merged.nodeIds).toEqual(['b', 'a']);
    });
});
