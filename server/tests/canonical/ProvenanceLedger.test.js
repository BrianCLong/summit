"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ledger_1 = require("../../src/provenance/ledger");
const pg_1 = require("../../src/db/pg");
// Mock DB pool
globals_1.jest.mock('../../src/db/pg', () => ({
    pool: {
        connect: globals_1.jest.fn(),
        query: globals_1.jest.fn(),
    }
}));
// Mock crypto pipeline to avoid startup issues
globals_1.jest.mock('../../src/security/crypto/index.js', () => ({
    createDefaultCryptoPipeline: globals_1.jest.fn(() => Promise.resolve({})),
}));
(0, globals_1.describe)('ProvenanceLedgerV2', () => {
    let ledger;
    let mockClient;
    (0, globals_1.beforeEach)(() => {
        mockClient = {
            query: globals_1.jest.fn(),
            release: globals_1.jest.fn(),
        };
        pg_1.pool.connect.mockResolvedValue(mockClient);
        // We need to bypass the singleton to test properly or mock the methods on the singleton?
        // The class is exported, so we can instantiate it for testing.
        ledger = new ledger_1.ProvenanceLedgerV2();
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
        ledger.cleanup();
    });
    (0, globals_1.it)('should append a claim entry', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [] }) // BEGIN
            .mockResolvedValueOnce({ rows: [] }) // getLastEntry (empty)
            .mockResolvedValueOnce({ rows: [] }) // INSERT
            .mockResolvedValueOnce({ rows: [] }); // COMMIT
        const claimData = {
            mutationType: 'CREATE',
            entityId: 'claim-1',
            entityType: 'Claim',
            statement: 'Test Claim',
            relatedClaims: [{ claimId: 'c2', relationship: 'supports' }],
            newState: {
                id: 'claim-1',
                type: 'Claim',
                version: 1,
                data: { statement: 'Test Claim' },
                metadata: {},
            },
        };
        await ledger.appendEntry({
            tenantId: 'tenant-1',
            timestamp: new Date(),
            actionType: 'REGISTER_CLAIM',
            resourceType: 'Claim',
            resourceId: 'claim-1',
            actorId: 'user-1',
            actorType: 'user',
            payload: claimData,
            metadata: {},
        });
        (0, globals_1.expect)(mockClient.query).toHaveBeenCalledTimes(4);
        const insertCall = mockClient.query.mock.calls[2];
        const insertSql = insertCall[0];
        const insertParams = insertCall[1];
        (0, globals_1.expect)(insertSql).toContain('INSERT INTO provenance_ledger_v2');
        (0, globals_1.expect)(insertParams[6]).toBe('REGISTER_CLAIM');
        (0, globals_1.expect)(insertParams[7]).toBe('Claim');
        (0, globals_1.expect)(insertParams[8]).toBe('claim-1');
        const payload = JSON.parse(insertParams[11]);
        (0, globals_1.expect)(payload.statement).toBe('Test Claim');
        (0, globals_1.expect)(payload.relatedClaims).toEqual(claimData.relatedClaims);
    });
});
