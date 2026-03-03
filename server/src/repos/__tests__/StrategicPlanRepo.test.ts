/**
 * StrategicPlanRepo Unit Test Suite
 */

import { jest } from '@jest/globals';
import { StrategicPlanRepo } from '../StrategicPlanRepo.js';
import type { Pool } from 'pg';

describe('StrategicPlanRepo', () => {
  const tenantId = 'tenant-123';
  let repo: StrategicPlanRepo;
  let mockPgPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPgPool = {
      query: jest.fn(),
    } as any;

    repo = new StrategicPlanRepo(mockPgPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getObjectivesByPlan', () => {
    it('should hydrate objectives with milestones and key results', async () => {
      const planId = 'plan-1';
      const mockObjective = {
        id: 'obj-1',
        plan_id: planId,
        name: 'Objective 1',
        description: 'Desc',
        status: 'NOT_STARTED',
        priority: 'MEDIUM',
        target_value: 100,
        current_value: 0,
        unit: 'units',
        start_date: new Date(),
        target_date: new Date(),
        created_by: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockMilestone = {
        id: 'ms-1',
        parent_id: 'obj-1',
        parent_type: 'objective',
        name: 'Milestone 1',
        description: 'Desc',
        status: 'PENDING',
        due_date: new Date(),
        deliverables: [],
        dependencies: [],
      };

      const mockKeyResult = {
        id: 'kr-1',
        objective_id: 'obj-1',
        description: 'KR 1',
        target_value: 100,
        current_value: 0,
        unit: 'units',
        weight: 1,
        status: 'NOT_STARTED',
        due_date: new Date(),
        updated_at: new Date(),
      };

      mockPgPool.query
        .mockResolvedValueOnce({ rows: [mockObjective] } as any) // objectives
        .mockResolvedValueOnce({ rows: [mockMilestone] } as any) // milestones
        .mockResolvedValueOnce({ rows: [mockKeyResult] } as any); // key results

      const results = await repo.getObjectivesByPlan(planId);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('obj-1');
      expect(results[0].milestones).toHaveLength(1);
      expect(results[0].milestones[0].id).toBe('ms-1');
      expect(results[0].keyResults).toHaveLength(1);
      expect(results[0].keyResults[0].id).toBe('kr-1');

      expect(mockPgPool.query).toHaveBeenCalledTimes(3);
    });

    it('should return empty array if no objectives found', async () => {
      mockPgPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const results = await repo.getObjectivesByPlan('plan-1');

      expect(results).toEqual([]);
      expect(mockPgPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('getInitiativesByPlan', () => {
    it('should hydrate initiatives with milestones and deliverables', async () => {
      const planId = 'plan-1';
      const mockInitiative = {
        id: 'init-1',
        plan_id: planId,
        objective_ids: [],
        name: 'Initiative 1',
        description: 'Desc',
        type: 'COLLECTION',
        status: 'NOT_STARTED',
        priority: 'MEDIUM',
        start_date: new Date(),
        end_date: new Date(),
        budget: 1000,
        budget_used: 0,
        assigned_to: [],
        risks: [],
        dependencies: [],
        created_by: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockMilestone = {
        id: 'ms-1',
        parent_id: 'init-1',
        parent_type: 'initiative',
        name: 'Milestone 1',
        status: 'PENDING',
        due_date: new Date(),
        deliverables: [],
        dependencies: [],
      };

      const mockDeliverable = {
        id: 'del-1',
        initiative_id: 'init-1',
        name: 'Deliverable 1',
        description: 'Desc',
        type: 'REPORT',
        status: 'PENDING',
        due_date: new Date(),
        completed_at: null,
        artifacts: [],
      };

      mockPgPool.query
        .mockResolvedValueOnce({ rows: [mockInitiative] } as any) // initiatives
        .mockResolvedValueOnce({ rows: [mockMilestone] } as any) // milestones
        .mockResolvedValueOnce({ rows: [mockDeliverable] } as any); // deliverables

      const results = await repo.getInitiativesByPlan(planId);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('init-1');
      expect(results[0].milestones).toHaveLength(1);
      expect(results[0].deliverables).toHaveLength(1);

      expect(mockPgPool.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('getRisksByPlan', () => {
    it('should hydrate risks with mitigation strategies', async () => {
      const planId = 'plan-1';
      const mockRisk = {
        id: 'risk-1',
        plan_id: planId,
        name: 'Risk 1',
        description: 'Desc',
        category: 'OPERATIONAL',
        likelihood: 3,
        impact: 4,
        risk_score: 12,
        risk_level: 'HIGH',
        status: 'IDENTIFIED',
        contingency_plans: [],
        owner: 'user-1',
        identified_at: new Date(),
        last_assessed_at: new Date(),
        review_date: new Date(),
      };

      const mockMitigation = {
        id: 'mit-1',
        risk_id: 'risk-1',
        description: 'Mitigation 1',
        type: 'AVOID',
        status: 'PLANNED',
        effectiveness: 80,
        cost: 100,
        owner: 'user-1',
        deadline: new Date(),
      };

      mockPgPool.query
        .mockResolvedValueOnce({ rows: [mockRisk] } as any) // risks
        .mockResolvedValueOnce({ rows: [mockMitigation] } as any); // mitigations

      const results = await repo.getRisksByPlan(planId);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('risk-1');
      expect(results[0].mitigationStrategies).toHaveLength(1);

      expect(mockPgPool.query).toHaveBeenCalledTimes(2);
    });
  });
});
