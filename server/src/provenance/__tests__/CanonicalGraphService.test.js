"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const CanonicalGraphService_js_1 = require("../CanonicalGraphService.js");
const neo4j_js_1 = require("../../db/neo4j.js");
// Mock neo4j session
globals_1.jest.mock('../../db/neo4j', () => ({
    neo: {
        session: globals_1.jest.fn().mockReturnValue({
            run: globals_1.jest.fn(),
            close: globals_1.jest.fn()
        })
    }
}));
(0, globals_1.describe)('CanonicalGraphService', () => {
    let service;
    const mockSession = {
        run: globals_1.jest.fn(),
        close: globals_1.jest.fn()
    };
    (0, globals_1.beforeEach)(() => {
        neo4j_js_1.neo.session.mockReturnValue(mockSession);
        service = CanonicalGraphService_js_1.CanonicalGraphService.getInstance();
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('should project a provenance entry correctly with properties', async () => {
        const entry = {
            id: 'entry-1',
            tenantId: 'tenant-A',
            resourceId: 'doc-123',
            resourceType: 'Document',
            actionType: 'CREATE',
            currentHash: 'hash-123',
            timestamp: new Date(),
            metadata: {},
            payload: { uri: 's3://bucket/doc', version: 'v1' }
        };
        mockSession.run.mockResolvedValue({ records: [] });
        await service.projectEntry(entry);
        (0, globals_1.expect)(mockSession.run).toHaveBeenCalledWith(globals_1.expect.stringContaining('MERGE (n:CanonicalNode'), globals_1.expect.objectContaining({
            nodeType: 'Input',
            id: 'doc-123',
            tenantId: 'tenant-A',
            properties: globals_1.expect.stringContaining('"uri":"s3://bucket/doc"')
        }));
    });
    (0, globals_1.it)('should create relationship with MERGE source (robustness) and tentative flag', async () => {
        const entry = {
            id: 'entry-2',
            tenantId: 'tenant-A',
            resourceId: 'decision-456',
            resourceType: 'Decision',
            actionType: 'EVALUATE',
            currentHash: 'hash-456',
            timestamp: new Date(),
            metadata: {},
            payload: { sourceId: 'doc-123' }
        };
        mockSession.run.mockResolvedValue({ records: [] });
        await service.projectEntry(entry);
        // Verify robust edge creation query
        const calls = mockSession.run.mock.calls;
        const edgeQuery = calls.find(call => call[0].includes('MERGE (source)-[r:DERIVED_FROM'));
        (0, globals_1.expect)(edgeQuery).toBeDefined();
        (0, globals_1.expect)(edgeQuery[0]).toContain("SET r.isTentative = true"); // Defaults to DERIVED_FROM and Tentative
    });
    (0, globals_1.it)('should attempt edge repair', async () => {
        const entry = {
            id: 'entry-1',
            tenantId: 'tenant-A',
            resourceId: 'doc-123',
            resourceType: 'Document',
            actionType: 'CREATE',
            currentHash: 'hash-123',
            timestamp: new Date(),
            metadata: {},
            payload: {}
        };
        // Mock sequence for: 1. Create Node, 2. SourceIds (skip), 3. Outgoing edges check, 4. Upgrade
        mockSession.run.mockResolvedValueOnce({ records: [] }); // create node
        mockSession.run.mockResolvedValueOnce({
            records: [
                { get: (key) => key === 'targetType' ? 'Decision' : 'decision-456' }
            ]
        });
        mockSession.run.mockResolvedValueOnce({ records: [] }); // upgrade
        await service.projectEntry(entry);
        // Verify repair query (FED_INTO)
        (0, globals_1.expect)(mockSession.run).toHaveBeenCalledWith(globals_1.expect.stringContaining('MERGE (a)-[new:FED_INTO]->(b)'), globals_1.expect.any(Object));
    });
    (0, globals_1.it)('should calculate graph diff with modifications', async () => {
        // First call (Start Graph)
        mockSession.run.mockResolvedValueOnce({
            records: [{
                    get: () => ({
                        segments: [{
                                start: { properties: { id: 'n1', nodeType: 'Input', properties: '{"version":"v1"}' } },
                                end: { properties: { id: 'n1', nodeType: 'Input', properties: '{"version":"v1"}' } },
                                relationship: { type: 'SELF', properties: { timestamp: 0 } }
                            }]
                    })
                }]
        });
        // Second call (End Graph)
        mockSession.run.mockResolvedValueOnce({
            records: [{
                    get: () => ({
                        segments: [{
                                start: { properties: { id: 'n1', nodeType: 'Input', properties: '{"version":"v2"}' } },
                                end: { properties: { id: 'n1', nodeType: 'Input', properties: '{"version":"v2"}' } },
                                relationship: { type: 'SELF', properties: { timestamp: 0 } }
                            }]
                    })
                }]
        });
        const result = await service.getGraphDiff('n1', 'n1', 'tenant-A');
        (0, globals_1.expect)(result.modifications).toHaveLength(1);
        (0, globals_1.expect)(result.modifications[0]).toMatchObject({
            nodeId: 'n1',
            field: 'version',
            oldValue: 'v1',
            newValue: 'v2'
        });
    });
    (0, globals_1.it)('should respect depth cap in explainCausality', async () => {
        mockSession.run.mockResolvedValue({ records: [] });
        // Request depth 100
        await service.explainCausality('node-1', 'tenant-A', 100);
        // Verify called with cap (20)
        (0, globals_1.expect)(mockSession.run).toHaveBeenCalledWith(globals_1.expect.stringContaining('[*1..20]'), globals_1.expect.any(Object));
    });
    (0, globals_1.it)('should enforce tenant isolation (Negative Test)', async () => {
        // Simulate attempting to explain causality for a node that belongs to another tenant
        // The service query explicitly includes { tenantId: $tenantId } in the MATCH clause for the end node.
        // So if we request with 'tenant-A' but the node in DB has 'tenant-B', it won't match.
        mockSession.run.mockResolvedValue({ records: [] }); // Return empty because tenant mismatch means no path found to end node
        const result = await service.explainCausality('node-secret', 'tenant-attacker');
        (0, globals_1.expect)(mockSession.run).toHaveBeenCalledWith(globals_1.expect.stringContaining('tenantId: $tenantId'), globals_1.expect.objectContaining({ tenantId: 'tenant-attacker' }));
        (0, globals_1.expect)(result.nodes).toHaveLength(0);
    });
});
