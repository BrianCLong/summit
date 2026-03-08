"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const StrategicPlanRepo_js_1 = require("../StrategicPlanRepo.js");
describe('StrategicPlanRepo Functional Verification', () => {
    let mockPg;
    let repo;
    beforeEach(() => {
        mockPg = {
            query: globals_1.jest.fn(),
        };
        repo = new StrategicPlanRepo_js_1.StrategicPlanRepo(mockPg);
    });
    describe('getInitiativesByPlan', () => {
        it('should correctly associate milestones and deliverables to initiatives', async () => {
            const planId = 'plan-1';
            // Mock Initiatives
            mockPg.query.mockResolvedValueOnce({
                rows: [
                    { id: 'i1', plan_id: planId, name: 'Initiative 1', start_date: new Date() },
                    { id: 'i2', plan_id: planId, name: 'Initiative 2', start_date: new Date() },
                ]
            });
            // Mock Milestones (batch)
            mockPg.query.mockResolvedValueOnce({
                rows: [
                    { id: 'm1', parent_id: 'i1', parent_type: 'initiative', name: 'Milestone 1', due_date: new Date() },
                    { id: 'm2', parent_id: 'i2', parent_type: 'initiative', name: 'Milestone 2', due_date: new Date() },
                ]
            });
            // Mock Deliverables (batch)
            mockPg.query.mockResolvedValueOnce({
                rows: [
                    { id: 'd1', initiative_id: 'i1', name: 'Deliverable 1', due_date: new Date() },
                    { id: 'd2', initiative_id: 'i2', name: 'Deliverable 2', due_date: new Date() },
                ]
            });
            const initiatives = await repo.getInitiativesByPlan(planId);
            expect(initiatives).toHaveLength(2);
            const i1 = initiatives.find(i => i.id === 'i1');
            expect(i1?.milestones).toHaveLength(1);
            expect(i1?.milestones[0].id).toBe('m1');
            expect(i1?.deliverables).toHaveLength(1);
            expect(i1?.deliverables[0].id).toBe('d1');
            const i2 = initiatives.find(i => i.id === 'i2');
            expect(i2?.milestones).toHaveLength(1);
            expect(i2?.milestones[0].id).toBe('m2');
            expect(i2?.deliverables).toHaveLength(1);
            expect(i2?.deliverables[0].id).toBe('d2');
        });
        it('should return empty arrays for relations if none found', async () => {
            mockPg.query.mockResolvedValueOnce({
                rows: [{ id: 'i1', plan_id: 'p1', name: 'Init', start_date: new Date() }]
            });
            mockPg.query.mockResolvedValue({ rows: [] }); // For both milestones and deliverables
            const initiatives = await repo.getInitiativesByPlan('p1');
            expect(initiatives[0].milestones).toEqual([]);
            expect(initiatives[0].deliverables).toEqual([]);
        });
    });
    describe('getObjectivesByPlan', () => {
        it('should correctly associate milestones and key results to objectives', async () => {
            const planId = 'plan-1';
            mockPg.query.mockResolvedValueOnce({
                rows: [{ id: 'o1', plan_id: planId, name: 'Obj 1' }]
            });
            // Milestones
            mockPg.query.mockResolvedValueOnce({
                rows: [{ id: 'm1', parent_id: 'o1', parent_type: 'objective', name: 'M1', due_date: new Date() }]
            });
            // Key Results
            mockPg.query.mockResolvedValueOnce({
                rows: [{ id: 'kr1', objective_id: 'o1', description: 'KR1', due_date: new Date() }]
            });
            const objectives = await repo.getObjectivesByPlan(planId);
            expect(objectives).toHaveLength(1);
            expect(objectives[0].milestones).toHaveLength(1);
            expect(objectives[0].keyResults).toHaveLength(1);
        });
    });
    describe('getRisksByPlan', () => {
        it('should correctly associate mitigations to risks', async () => {
            mockPg.query.mockResolvedValueOnce({
                rows: [{ id: 'r1', plan_id: 'p1', name: 'Risk 1', risk_score: 10 }]
            });
            mockPg.query.mockResolvedValueOnce({
                rows: [{ id: 'mt1', risk_id: 'r1', description: 'Mitigation 1', deadline: new Date() }]
            });
            const risks = await repo.getRisksByPlan('p1');
            expect(risks).toHaveLength(1);
            expect(risks[0].mitigationStrategies).toHaveLength(1);
        });
    });
});
