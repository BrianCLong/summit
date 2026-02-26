// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { StrategicPlanRepo } from '../../repos/StrategicPlanRepo.js';

// Mock provenance ledger to return promises
jest.mock('../../provenance/ledger.js', () => ({
  provenanceLedger: {
    appendEntry: jest.fn().mockImplementation(() => Promise.resolve(undefined)),
  },
}));

describe('StrategicPlanRepo Optimization', () => {
  let repo: StrategicPlanRepo;
  let mockPool: any;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
    };
    repo = new StrategicPlanRepo(mockPool);
  });

  describe('getInitiativesByPlan', () => {
    it('should use bulk queries to avoid N+1 problem', async () => {
      const planId = 'plan-123';
      const mockInitiatives = [
        { id: 'init-1', plan_id: planId, name: 'Init 1', objective_ids: [] },
        { id: 'init-2', plan_id: planId, name: 'Init 2', objective_ids: [] },
      ];

      const mockMilestones = [
        { id: 'ms-1', parent_id: 'init-1', parent_type: 'initiative', name: 'MS 1' },
        { id: 'ms-2', parent_id: 'init-2', parent_type: 'initiative', name: 'MS 2' },
      ];

      const mockDeliverables = [
        { id: 'del-1', initiative_id: 'init-1', name: 'Del 1' },
        { id: 'del-2', initiative_id: 'init-2', name: 'Del 2' },
      ];

      // 1st call: fetch initiatives
      mockPool.query.mockResolvedValueOnce({ rows: mockInitiatives });
      // 2nd and 3rd calls: bulk fetch milestones and deliverables (Parallel)
      mockPool.query.mockResolvedValueOnce({ rows: mockMilestones });
      mockPool.query.mockResolvedValueOnce({ rows: mockDeliverables });

      const result = await repo.getInitiativesByPlan(planId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('init-1');
      expect(result[0].milestones).toHaveLength(1);
      expect(result[0].milestones[0].id).toBe('ms-1');
      expect(result[0].deliverables).toHaveLength(1);
      expect(result[0].deliverables[0].id).toBe('del-1');

      expect(result[1].id).toBe('init-2');
      expect(result[1].milestones).toHaveLength(1);
      expect(result[1].milestones[0].id).toBe('ms-2');
      expect(result[1].deliverables).toHaveLength(1);
      expect(result[1].deliverables[0].id).toBe('del-2');

      // Total of 3 queries: 1 for initiatives, 1 for milestones, 1 for deliverables
      expect(mockPool.query).toHaveBeenCalledTimes(3);

      // Verify bulk query for milestones
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE parent_id = ANY($1)'),
        [['init-1', 'init-2']]
      );
    });

    it('should return empty array if no initiatives found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const result = await repo.getInitiativesByPlan('plan-empty');
      expect(result).toEqual([]);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRisksByPlan', () => {
    it('should use bulk queries to avoid N+1 problem', async () => {
      const planId = 'plan-123';
      const mockRisks = [
        { id: 'risk-1', plan_id: planId, name: 'Risk 1', likelihood: 3, impact: 4, risk_score: 12 },
        { id: 'risk-2', plan_id: planId, name: 'Risk 2', likelihood: 2, impact: 2, risk_score: 4 },
      ];

      const mockMitigations = [
        { id: 'mit-1', risk_id: 'risk-1', description: 'Mit 1', type: 'MITIGATE', effectiveness: 80 },
        { id: 'mit-2', risk_id: 'risk-2', description: 'Mit 2', type: 'ACCEPT', effectiveness: 100 },
      ];

      // 1st call: fetch risks
      mockPool.query.mockResolvedValueOnce({ rows: mockRisks });
      // 2nd call: bulk fetch mitigations
      mockPool.query.mockResolvedValueOnce({ rows: mockMitigations });

      const result = await repo.getRisksByPlan(planId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('risk-1');
      expect(result[0].mitigationStrategies).toHaveLength(1);
      expect(result[0].mitigationStrategies[0].id).toBe('mit-1');

      expect(result[1].id).toBe('risk-2');
      expect(result[1].mitigationStrategies).toHaveLength(1);
      expect(result[1].mitigationStrategies[0].id).toBe('mit-2');

      // Total of 2 queries: 1 for risks, 1 for mitigations
      expect(mockPool.query).toHaveBeenCalledTimes(2);

      // Verify bulk query
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE risk_id = ANY($1)'),
        [['risk-1', 'risk-2']]
      );
    });
  });
});
