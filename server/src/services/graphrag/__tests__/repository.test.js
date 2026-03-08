"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const CaseGraphRepository_js_1 = require("../repositories/CaseGraphRepository.js");
const neo4j_js_1 = require("../../../graph/neo4j.js");
// Mock runCypher
globals_1.jest.mock('../../../graph/neo4j', () => ({
    runCypher: globals_1.jest.fn(),
}));
(0, globals_1.describe)('Neo4jCaseGraphRepository', () => {
    let repo;
    // @ts-ignore
    const mockRunCypher = neo4j_js_1.runCypher;
    (0, globals_1.beforeEach)(() => {
        repo = new CaseGraphRepository_js_1.Neo4jCaseGraphRepository();
        mockRunCypher.mockClear();
    });
    (0, globals_1.describe)('getSubgraphByCypher', () => {
        (0, globals_1.it)('should reject queries without $caseId scope', async () => {
            const unsafeCypher = 'MATCH (n) RETURN n';
            await (0, globals_1.expect)(repo.getSubgraphByCypher('case-123', unsafeCypher))
                .rejects
                .toThrow('Security Violation: Cypher query must be scoped to the active Case ID.');
        });
        (0, globals_1.it)('should execute valid scoped queries', async () => {
            const validCypher = 'MATCH (c:Case {id: $caseId})-->(n) RETURN n';
            // Mock result
            mockRunCypher.mockResolvedValue([
                { n: { identity: 1, labels: ['Person'], properties: { id: 'p1', name: 'Alice' } } }
            ]);
            const result = await repo.getSubgraphByCypher('case-123', validCypher);
            (0, globals_1.expect)(mockRunCypher).toHaveBeenCalledWith(validCypher, globals_1.expect.objectContaining({ caseId: 'case-123' }));
            (0, globals_1.expect)(result.nodes).toHaveLength(1);
            (0, globals_1.expect)(result.nodes[0].id).toBe('p1');
        });
        (0, globals_1.it)('should handle complex paths', async () => {
            const validCypher = 'MATCH (c:Case {id: $caseId})-[*]-(n) RETURN n';
            // Mock result with a path segment
            mockRunCypher.mockResolvedValue([
                {
                    path: {
                        segments: [{
                                start: { identity: 1, labels: ['Case'], properties: { id: 'c1' } },
                                end: { identity: 2, labels: ['Person'], properties: { id: 'p1', name: 'Bob' } },
                                relationship: { identity: 10, type: 'RELATED_TO', properties: {} }
                            }]
                    }
                }
            ]);
            const result = await repo.getSubgraphByCypher('case-123', validCypher);
            (0, globals_1.expect)(result.nodes).toHaveLength(2); // Case and Person
            (0, globals_1.expect)(result.edges).toHaveLength(1);
        });
    });
});
