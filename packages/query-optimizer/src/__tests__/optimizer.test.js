"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const planner_1 = require("../optimizer/planner");
const ims_manager_1 = require("../materialized/ims-manager");
// Mock pg Pool
const mockQuery = jest.fn();
const mockPool = {
    query: mockQuery,
};
describe('Graph Optimizer and IMS', () => {
    beforeEach(() => {
        mockQuery.mockReset();
    });
    describe('GraphQueryPlanner', () => {
        it('should generate an explain plan with cost estimates', () => {
            const planner = new planner_1.GraphQueryPlanner();
            const query = 'MATCH (p:Person)-[:KNOWS]->(f:Person) WHERE p.name = "Alice" RETURN f';
            const result = planner.explain(query);
            expect(result.cost.totalCost).toBeGreaterThan(0);
            expect(result.plan.operator).toBe('ProduceResults');
            expect(result.plan.children).toBeDefined();
            if (result.plan.children && result.plan.children.length > 0) {
                expect(result.plan.children[0].operator).toBe('Match');
            }
        });
        it('should detect high risk cross-tenant queries', () => {
            const planner = new planner_1.GraphQueryPlanner();
            const query = 'MATCH (a), (b) RETURN a, b'; // Cartesian product
            const result = planner.explain(query, [], { tenantId: 't1' }); // Context implies we care about policy
            // Cost should be very high due to penalty
            expect(result.cost.totalCost).toBeGreaterThan(1000);
            if (result.plan.safetyNotes) {
                expect(result.plan.safetyNotes.join(' ')).toContain('HIGH RISK');
            }
            else {
                expect(result.plan.safetyNotes).toBeDefined();
            }
        });
    });
    describe('IncrementalSubgraphManager', () => {
        it('should register and refresh a view with provenance', async () => {
            const manager = new ims_manager_1.IncrementalSubgraphManager(mockPool);
            const viewDef = {
                name: 'HighValueCustomers',
                cypherQuery: 'MATCH (c:Customer) WHERE c.value > 1000 RETURN c',
                refreshStrategy: 'incremental',
                dependencies: ['Customer'],
                policyTags: ['commercial']
            };
            // Mock registerView check
            mockQuery.mockResolvedValueOnce({ rowCount: 0 }); // View doesn't exist
            // Mock registerView insert
            mockQuery.mockResolvedValueOnce({});
            await manager.registerView(viewDef);
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT 1 FROM ims_views'), expect.any(Array));
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO ims_views'), expect.any(Array));
            // Mock refreshSubgraph get view
            mockQuery.mockResolvedValueOnce({
                rowCount: 1,
                rows: [{ definition: viewDef }]
            });
            // Mock refreshSubgraph insert manifest
            mockQuery.mockResolvedValueOnce({});
            const manifest = await manager.refreshSubgraph('HighValueCustomers', 'user-123');
            expect(manifest.viewName).toBe('HighValueCustomers');
            expect(manifest.actor).toBe('user-123');
            expect(manifest.signature).toBeDefined();
            expect(manifest.signature.length).toBeGreaterThan(0);
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO ims_manifests'), expect.any(Array));
        });
    });
});
