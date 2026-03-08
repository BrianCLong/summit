"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const EntityRepo_1 = require("../../src/repos/EntityRepo");
const InvestigationRepo_1 = require("../../src/repos/InvestigationRepo");
// Mock dependencies
const mockPgPool = {
    connect: globals_1.jest.fn(),
    query: globals_1.jest.fn(),
};
const mockNeo4jSession = {
    executeWrite: globals_1.jest.fn(),
    close: globals_1.jest.fn(),
};
const mockNeo4jDriver = {
    session: globals_1.jest.fn(() => mockNeo4jSession),
};
(0, globals_1.describe)('Multi-Tenant Isolation Test Suite', () => {
    let entityRepo;
    let investigationRepo;
    const TENANT_A = 'tenant-a';
    const TENANT_B = 'tenant-b';
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        // Setup repo instances
        entityRepo = new EntityRepo_1.EntityRepo(mockPgPool, mockNeo4jDriver);
        investigationRepo = new InvestigationRepo_1.InvestigationRepo(mockPgPool);
        // Default mock implementation for connect to return a client
        mockPgPool.connect.mockResolvedValue({
            query: globals_1.jest.fn(),
            release: globals_1.jest.fn(),
        });
        mockNeo4jDriver.session.mockReturnValue(mockNeo4jSession);
    });
    (0, globals_1.describe)('InvestigationRepo Isolation', () => {
        (0, globals_1.it)('should include tenant_id in update query', async () => {
            // Setup mock query result
            mockPgPool.query.mockResolvedValue({ rows: [] });
            const input = { id: 'inv-123', name: 'New Name', tenantId: TENANT_A };
            await investigationRepo.update(input);
            // Verify query structure
            const calls = mockPgPool.query.mock.calls;
            const updateCall = calls.find((call) => call[0].includes('UPDATE investigations'));
            (0, globals_1.expect)(updateCall).toBeDefined();
            (0, globals_1.expect)(updateCall[0]).toContain('WHERE id = $1 AND tenant_id = $3');
            (0, globals_1.expect)(updateCall[1]).toContain(TENANT_A);
            (0, globals_1.expect)(updateCall[1]).toContain(input.id);
        });
        (0, globals_1.it)('should include tenant_id in delete query', async () => {
            // Mock client for transaction
            const mockClient = {
                query: globals_1.jest.fn(),
                release: globals_1.jest.fn(),
            };
            mockPgPool.connect.mockResolvedValue(mockClient);
            mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });
            await investigationRepo.delete('inv-123', TENANT_A);
            // Verify query structure
            const calls = mockClient.query.mock.calls;
            const deleteCall = calls.find((call) => call[0].includes('DELETE FROM investigations'));
            (0, globals_1.expect)(deleteCall).toBeDefined();
            (0, globals_1.expect)(deleteCall[0]).toContain('WHERE id = $1 AND tenant_id = $2');
            (0, globals_1.expect)(deleteCall[1]).toEqual(['inv-123', TENANT_A]);
        });
    });
    (0, globals_1.describe)('EntityRepo Isolation', () => {
        (0, globals_1.it)('should include tenant_id in update query', async () => {
            // Mock client for transaction
            const mockClient = {
                query: globals_1.jest.fn(),
                release: globals_1.jest.fn(),
            };
            mockPgPool.connect.mockResolvedValue(mockClient);
            mockClient.query.mockResolvedValue({ rows: [] });
            const input = { id: 'ent-123', props: { foo: 'bar' }, tenantId: TENANT_B };
            await entityRepo.update(input);
            // Verify query structure
            const calls = mockClient.query.mock.calls;
            const updateCall = calls.find((call) => call[0].includes('UPDATE entities'));
            (0, globals_1.expect)(updateCall).toBeDefined();
            (0, globals_1.expect)(updateCall[0]).toContain('WHERE id = $1 AND tenant_id = $3');
            (0, globals_1.expect)(updateCall[1]).toContain(TENANT_B);
            (0, globals_1.expect)(updateCall[1]).toContain(input.id);
        });
        (0, globals_1.it)('should include tenant_id in delete query (PG and Neo4j)', async () => {
            // Mock client for transaction
            const mockClient = {
                query: globals_1.jest.fn(),
                release: globals_1.jest.fn(),
            };
            mockPgPool.connect.mockResolvedValue(mockClient);
            // Simulate successful PG delete
            mockClient.query.mockImplementation((query) => {
                if (query.includes('DELETE FROM entities')) {
                    return Promise.resolve({ rows: [{ tenant_id: TENANT_B }] });
                }
                return Promise.resolve({ rows: [] });
            });
            await entityRepo.delete('ent-123', TENANT_B);
            // Verify PG delete
            const pgCalls = mockClient.query.mock.calls;
            const deleteCall = pgCalls.find((call) => call[0].includes('DELETE FROM entities'));
            (0, globals_1.expect)(deleteCall[0]).toContain('WHERE id = $1 AND tenant_id = $2');
            (0, globals_1.expect)(deleteCall[1]).toEqual(['ent-123', TENANT_B]);
            // Verify Neo4j delete
            (0, globals_1.expect)(mockNeo4jSession.executeWrite).toHaveBeenCalled();
            // We need to inspect the callback passed to executeWrite
            const executeWriteCallback = mockNeo4jSession.executeWrite.mock.calls[0][0];
            const mockTx = { run: globals_1.jest.fn() };
            await executeWriteCallback(mockTx);
            (0, globals_1.expect)(mockTx.run).toHaveBeenCalled();
            const neo4jCall = mockTx.run.mock.calls[0];
            const neo4jQuery = neo4jCall[0];
            const neo4jParams = neo4jCall[1];
            (0, globals_1.expect)(neo4jQuery).toContain('MATCH (e:Entity {id: $id})');
            (0, globals_1.expect)(neo4jParams).toEqual({ id: 'ent-123' });
        });
    });
});
