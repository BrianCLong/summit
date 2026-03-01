import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { StrategicPlanRepo } from '../../repos/StrategicPlanRepo.js';

describe('StrategicPlanRepo Optimization', () => {
  let repo: StrategicPlanRepo;
  let mockPg: any;

  beforeEach(() => {
    mockPg = {
      query: jest.fn(),
    };
    repo = new StrategicPlanRepo(mockPg as any);
  });

  describe('getObjectivesByPlan', () => {
    it('should use bulk queries to avoid N+1 problem', async () => {
      const planId = 'plan-123';
      const mockObjectives = [
        { id: 'obj-1', plan_id: planId, name: 'Objective 1' },
        { id: 'obj-2', plan_id: planId, name: 'Objective 2' },
      ];

      mockPg.query.mockImplementation((query: string, params: any[]) => {
        if (query.includes('FROM strategic_objectives')) {
          return Promise.resolve({ rows: mockObjectives });
        }
        if (query.includes('FROM strategic_milestones')) {
          return Promise.resolve({
            rows: [
              { id: 'm-1', parent_id: 'obj-1', parent_type: 'objective', name: 'Milestone 1' },
            ],
          });
        }
        if (query.includes('FROM strategic_key_results')) {
          return Promise.resolve({
            rows: [
              { id: 'kr-1', objective_id: 'obj-2', description: 'KR 1' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repo.getObjectivesByPlan(planId);

      expect(result).toHaveLength(2);
      // Verify bulk queries were called once instead of per-objective
      expect(mockPg.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM strategic_objectives'),
        [planId]
      );
      expect(mockPg.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM strategic_milestones'),
        [['obj-1', 'obj-2']]
      );
      expect(mockPg.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM strategic_key_results'),
        [['obj-1', 'obj-2']]
      );

      // Verify mapping
      expect(result[0].id).toBe('obj-1');
      expect(result[0].milestones).toHaveLength(1);
      expect(result[0].keyResults).toHaveLength(0);

      expect(result[1].id).toBe('obj-2');
      expect(result[1].milestones).toHaveLength(0);
      expect(result[1].keyResults).toHaveLength(1);
    });
  });

  describe('getInitiativesByPlan', () => {
    it('should use bulk queries to avoid N+1 problem', async () => {
      const planId = 'plan-123';
      const mockInitiatives = [
        { id: 'ini-1', plan_id: planId, name: 'Initiative 1' },
        { id: 'ini-2', plan_id: planId, name: 'Initiative 2' },
      ];

      mockPg.query.mockImplementation((query: string, params: any[]) => {
        if (query.includes('FROM strategic_initiatives')) {
          return Promise.resolve({ rows: mockInitiatives });
        }
        if (query.includes('FROM strategic_milestones')) {
          return Promise.resolve({
            rows: [
              { id: 'm-2', parent_id: 'ini-1', parent_type: 'initiative', name: 'Milestone 2' },
            ],
          });
        }
        if (query.includes('FROM strategic_deliverables')) {
          return Promise.resolve({
            rows: [
              { id: 'd-1', initiative_id: 'ini-2', name: 'Deliverable 1' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repo.getInitiativesByPlan(planId);

      expect(result).toHaveLength(2);
      expect(mockPg.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM strategic_milestones'),
        [['ini-1', 'ini-2']]
      );
      expect(mockPg.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM strategic_deliverables'),
        [['ini-1', 'ini-2']]
      );
    });

    it('should return empty array if no initiatives found', async () => {
        mockPg.query.mockResolvedValue({ rows: [] });
        const result = await repo.getInitiativesByPlan('empty-plan');
        expect(result).toEqual([]);
        expect(mockPg.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRisksByPlan', () => {
    it('should use bulk queries to avoid N+1 problem', async () => {
      const planId = 'plan-123';
      const mockRisks = [
        { id: 'risk-1', plan_id: planId, name: 'Risk 1' },
      ];

      mockPg.query.mockImplementation((query: string, params: any[]) => {
        if (query.includes('FROM strategic_risks')) {
          return Promise.resolve({ rows: mockRisks });
        }
        if (query.includes('FROM strategic_mitigations')) {
          return Promise.resolve({
            rows: [
              { id: 'mit-1', risk_id: 'risk-1', description: 'Mitigation 1' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repo.getRisksByPlan(planId);

      expect(result).toHaveLength(1);
      expect(mockPg.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM strategic_mitigations'),
        [['risk-1']]
      );
      expect(result[0].mitigationStrategies).toHaveLength(1);
    });
  });
});
