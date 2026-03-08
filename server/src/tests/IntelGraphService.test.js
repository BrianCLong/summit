"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const IntelGraphService_js_1 = require("../services/IntelGraphService.js");
// Define shared mocks
const mockRun = globals_1.jest.fn();
const mockClose = globals_1.jest.fn();
const mockSession = { run: mockRun, close: mockClose };
const mockDriver = { session: globals_1.jest.fn(() => mockSession) };
// Mock neo4j
globals_1.jest.mock('../graph/neo4j.js');
// Mock configs and dependencies
globals_1.jest.mock('../config/database.js', () => ({
    getNeo4jDriver: globals_1.jest.fn(() => mockDriver),
    getPostgresPool: globals_1.jest.fn(),
    getRedisClient: globals_1.jest.fn(),
}));
globals_1.jest.mock('../audit/advanced-audit-system.js', () => ({
    advancedAuditSystem: {
        logEvent: globals_1.jest.fn(),
    },
}));
globals_1.jest.mock('../provenance/ledger.js', () => ({
    provenanceLedger: {
        appendEntry: globals_1.jest.fn(),
    },
    ProvenanceLedgerV2: globals_1.jest.fn(),
}));
(0, globals_1.describe)('IntelGraphService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        // Re-initialize to ensure fresh mocks
        // @ts-ignore
        IntelGraphService_js_1.IntelGraphService.instance = null;
        mockClose.mockResolvedValue(undefined);
        const dbModule = globals_1.jest.requireMock('../config/database.js');
        dbModule.getNeo4jDriver.mockReturnValue(mockDriver);
        mockDriver.session.mockReturnValue(mockSession);
        service = IntelGraphService_js_1.IntelGraphService.getInstance();
    });
    (0, globals_1.describe)('createEntity', () => {
        (0, globals_1.it)('should create an entity and log to ledger', async () => {
            const owner = 'user-1';
            const tenantId = 't1';
            const entityData = { name: 'Test Entity', description: 'Description' };
            const mockRecord = {
                get: globals_1.jest.fn().mockReturnValue({ properties: { id: 'uuid-1', ...entityData } })
            };
            // Reset mockRun implementation for this test
            mockRun.mockResolvedValue({ records: [mockRecord] });
            const result = await service.createEntity(entityData, owner, tenantId);
            (0, globals_1.expect)(result).toHaveProperty('id', 'uuid-1');
            (0, globals_1.expect)(result.name).toBe('Test Entity');
            (0, globals_1.expect)(mockRun).toHaveBeenCalledWith(globals_1.expect.stringContaining('CREATE (e:Entity'), globals_1.expect.objectContaining({ props: globals_1.expect.objectContaining({ name: 'Test Entity' }) }));
        });
    });
    (0, globals_1.describe)('createClaim', () => {
        (0, globals_1.it)('should create a claim linked to an entity', async () => {
            const owner = 'user-1';
            const tenantId = 't1';
            const claimData = {
                statement: 'AI is great',
                confidence: 0.9,
                entityId: '11111111-1111-1111-1111-111111111111',
            };
            const mockRecord = {
                get: globals_1.jest.fn().mockReturnValue({ properties: { id: 'c-1', ...claimData } })
            };
            mockRun.mockResolvedValue({ records: [mockRecord] });
            const result = await service.createClaim(claimData, owner, tenantId);
            (0, globals_1.expect)(result).toHaveProperty('id', 'c-1');
            (0, globals_1.expect)(result.statement).toBe('AI is great');
            (0, globals_1.expect)(mockRun).toHaveBeenCalledWith(globals_1.expect.stringContaining('CREATE (c:Claim'), globals_1.expect.anything());
        });
    });
});
