"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const StrategicPlanRepo_js_1 = require("../StrategicPlanRepo.js");
describe('StrategicPlanRepo N+1 Performance', () => {
    let mockPg;
    let repo;
    beforeEach(() => {
        mockPg = {
            query: globals_1.jest.fn(),
        };
        repo = new StrategicPlanRepo_js_1.StrategicPlanRepo(mockPg);
    });
    it('should fetch related entities for all initiatives in a single batch (O(1) queries)', async () => {
        // 1. Setup mock data for 3 initiatives
        const planId = 'plan-123';
        const initiativeRows = [
            { id: 'init-1', plan_id: planId, name: 'Init 1', start_date: new Date() },
            { id: 'init-2', plan_id: planId, name: 'Init 2', start_date: new Date() },
            { id: 'init-3', plan_id: planId, name: 'Init 3', start_date: new Date() },
        ];
        // 2. Mock first call to get initiatives
        mockPg.query.mockResolvedValueOnce({ rows: initiativeRows });
        // 3. Mock subsequent calls for milestones and deliverables
        // We expect 1 query for ALL milestones and 1 for ALL deliverables
        mockPg.query.mockResolvedValue({ rows: [] });
        // 4. Execute
        await repo.getInitiativesByPlan(planId);
        // 5. Assert: Total queries should be 3 (1 for initiatives, 1 for milestones, 1 for deliverables)
        // BEFORE OPTIMIZATION: it would be 1 + 2*N = 7 queries
        expect(mockPg.query).toHaveBeenCalledTimes(3);
        // Verify batch query usage
        const milestoneQuery = mockPg.query.mock.calls.find((call) => call[0].includes('strategic_milestones') && call[0].includes('ANY($1)'));
        expect(milestoneQuery).toBeDefined();
    });
    it('should fetch related entities for all risks in a single batch (O(1) queries)', async () => {
        const planId = 'plan-123';
        const riskRows = [
            { id: 'risk-1', plan_id: planId, name: 'Risk 1', risk_score: 10 },
            { id: 'risk-2', plan_id: planId, name: 'Risk 2', risk_score: 5 },
        ];
        mockPg.query.mockResolvedValueOnce({ rows: riskRows });
        mockPg.query.mockResolvedValue({ rows: [] });
        await repo.getRisksByPlan(planId);
        // 1 for risks, 1 for mitigations = 2 queries
        // BEFORE OPTIMIZATION: 1 + N = 3 queries
        expect(mockPg.query).toHaveBeenCalledTimes(2);
        const mitigationQuery = mockPg.query.mock.calls.find((call) => call[0].includes('strategic_mitigations') && call[0].includes('ANY($1)'));
        expect(mitigationQuery).toBeDefined();
    });
    it('should fetch related entities for all objectives in a single batch (O(1) queries)', async () => {
        const planId = 'plan-123';
        const objectiveRows = [
            { id: 'obj-1', plan_id: planId, name: 'Objective 1', created_at: new Date() },
            { id: 'obj-2', plan_id: planId, name: 'Objective 2', created_at: new Date() },
        ];
        mockPg.query.mockResolvedValueOnce({ rows: objectiveRows });
        mockPg.query.mockResolvedValue({ rows: [] });
        await repo.getObjectivesByPlan(planId);
        // Assert: Total queries should be 3 (1 for objectives, 1 for milestones, 1 for key results)
        // BEFORE OPTIMIZATION: it would be 1 + 2*N = 5 queries
        expect(mockPg.query).toHaveBeenCalledTimes(3);
        // Verify batch query usage for milestones
        const milestoneQuery = mockPg.query.mock.calls.find((call) => call[0].includes('strategic_milestones') &&
            call[0].includes('parent_type = \'objective\'') &&
            call[0].includes('ANY($1)'));
        expect(milestoneQuery).toBeDefined();
        // Verify batch query usage for key results
        const keyResultQuery = mockPg.query.mock.calls.find((call) => call[0].includes('strategic_key_results') && call[0].includes('ANY($1)'));
        expect(keyResultQuery).toBeDefined();
    });
});
