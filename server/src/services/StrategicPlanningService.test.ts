// @ts-nocheck
/**
 * Strategic Planning Service - Unit Tests
 *
 * Tests for the StrategicPlanningService business logic layer.
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { EventEmitter } from 'events';
import type { Pool, PoolClient, QueryResult } from 'pg';
import { StrategicPlanningService } from './StrategicPlanningService';
import type {
  StrategicPlan,
  StrategicObjective,
  Initiative,
  RiskAssessment,
  CreateStrategicPlanInput,
  UpdateStrategicPlanInput,
  CreateObjectiveInput,
  CreateInitiativeInput,
  CreateRiskInput,
  PlanStatus,
} from '../types/strategic-planning';

// Mock dependencies
jest.mock('../config/logger', () => ({
  __esModule: true,
  default: {
    child: () => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));

jest.mock('./CacheService', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('../otel', () => ({
  getTracer: () => ({
    startSpan: () => ({
      end: jest.fn(),
    }),
  }),
}));

jest.mock('../provenance/ledger', () => ({
  provenanceLedger: {
    appendEntry: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('StrategicPlanningService', () => {
  let service: StrategicPlanningService;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;

  const testTenantId = 'tenant-123';
  const testUserId = 'user-456';

  const mockPlanRow = {
    id: 'plan-001',
    tenant_id: testTenantId,
    investigation_id: null,
    name: 'Test Strategic Plan',
    description: 'A test plan for unit testing',
    status: 'DRAFT',
    priority: 'HIGH',
    time_horizon: 'MEDIUM_TERM',
    start_date: new Date('2025-01-01'),
    end_date: new Date('2025-12-31'),
    assumptions: ['Assumption 1'],
    constraints: ['Constraint 1'],
    dependencies: [],
    tags: ['test'],
    metadata: {},
    created_by: testUserId,
    created_at: new Date(),
    updated_at: new Date(),
    approved_by: null,
    approved_at: null,
    version: 1,
  };

  const mockObjectiveRow = {
    id: 'obj-001',
    plan_id: 'plan-001',
    name: 'Test Objective',
    description: 'A test objective',
    status: 'NOT_STARTED',
    priority: 'HIGH',
    target_value: 100,
    current_value: 0,
    unit: 'percent',
    start_date: new Date('2025-01-01'),
    target_date: new Date('2025-06-30'),
    aligned_intelligence_priorities: [],
    success_criteria: ['Criteria 1'],
    dependencies: [],
    created_by: testUserId,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    // Create mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as unknown as jest.Mocked<PoolClient>;

    // Create mock pool
    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient),
    } as unknown as jest.Mocked<Pool>;
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as QueryResult);

    // Reset mocks
    jest.clearAllMocks();

    // Create service instance
    service = new StrategicPlanningService(mockPool);
  });

  afterEach(() => {
    service.removeAllListeners();
  });

  describe('Plan CRUD Operations', () => {
    describe('createPlan', () => {
      it('should create a new strategic plan', async () => {
        const input: CreateStrategicPlanInput = {
          tenantId: testTenantId,
          name: 'New Plan',
          description: 'Test description',
          priority: 'HIGH',
          timeHorizon: 'MEDIUM_TERM',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
        };

        mockPool.query.mockResolvedValueOnce({
          rows: [mockPlanRow],
          rowCount: 1,
        } as QueryResult);

        // Mock loading relations (empty for new plan)
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult); // objectives
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult); // initiatives
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult); // risks
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult); // stakeholders
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult); // resources
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult); // kpis

        const result = await service.createPlan(input, testUserId);

        expect(result).toBeDefined();
        expect(result.id).toBe('plan-001');
        expect(result.name).toBe('Test Strategic Plan');
        expect(mockPool.query).toHaveBeenCalled();
      });

      it('should emit planCreated event', async () => {
        const input: CreateStrategicPlanInput = {
          tenantId: testTenantId,
          name: 'New Plan',
          description: 'Test description',
          priority: 'HIGH',
          timeHorizon: 'MEDIUM_TERM',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
        };

        mockPool.query.mockResolvedValueOnce({
          rows: [mockPlanRow],
          rowCount: 1,
        } as QueryResult);

        const eventPromise = new Promise<{ plan: StrategicPlan; userId: string }>((resolve) => {
          service.on('planCreated', resolve);
        });

        await service.createPlan(input, testUserId);

        const event = await eventPromise;
        expect(event.plan.id).toBe('plan-001');
        expect(event.userId).toBe(testUserId);
      });

      it('should throw error for invalid dates', async () => {
        const input: CreateStrategicPlanInput = {
          tenantId: testTenantId,
          name: 'New Plan',
          description: 'Test description',
          priority: 'HIGH',
          timeHorizon: 'MEDIUM_TERM',
          startDate: '2025-12-31',
          endDate: '2025-01-01', // End before start
        };

        await expect(service.createPlan(input, testUserId)).rejects.toThrow(
          'End date must be after start date',
        );
      });

      it('should throw error for empty name', async () => {
        const input: CreateStrategicPlanInput = {
          tenantId: testTenantId,
          name: '',
          description: 'Test description',
          priority: 'HIGH',
          timeHorizon: 'MEDIUM_TERM',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
        };

        await expect(service.createPlan(input, testUserId)).rejects.toThrow(
          'Plan name is required',
        );
      });
    });

    describe('updatePlan', () => {
      it('should update an existing plan', async () => {
        const input: UpdateStrategicPlanInput = {
          name: 'Updated Plan Name',
          priority: 'CRITICAL',
        };

        const repo = service['repo'] as any;
        jest.spyOn(repo, 'findPlanById').mockResolvedValue({
          ...mockPlanRow,
          objectives: [],
          initiatives: [],
          risks: [],
          stakeholders: [],
          resources: [],
          kpis: [],
        });
        jest.spyOn(repo, 'updatePlan').mockResolvedValue({
          ...mockPlanRow,
          name: 'Updated Plan Name',
          priority: 'CRITICAL',
          objectives: [],
          initiatives: [],
          risks: [],
          stakeholders: [],
          resources: [],
          kpis: [],
        });

        // Mock cache invalidation (del calls)
        const { cacheService } = await import('./CacheService.js');
        (cacheService.del as jest.Mock).mockResolvedValue(undefined);

        const result = await service.updatePlan('plan-001', input, testUserId, testTenantId);

        expect(result).toBeDefined();
        expect(result?.name).toBe('Updated Plan Name');
      });

      it('should validate status transitions', async () => {
        const input: UpdateStrategicPlanInput = {
          status: 'COMPLETED', // Invalid transition from DRAFT
        };

        const repo = service['repo'] as any;
        jest.spyOn(repo, 'findPlanById').mockResolvedValue({
          ...mockPlanRow,
          objectives: [],
          initiatives: [],
          risks: [],
          stakeholders: [],
          resources: [],
          kpis: [],
        });

        await expect(
          service.updatePlan('plan-001', input, testUserId, testTenantId),
        ).rejects.toThrow('Invalid status transition');
      });

      it('should allow valid status transition DRAFT -> UNDER_REVIEW', async () => {
        const input: UpdateStrategicPlanInput = {
          status: 'UNDER_REVIEW',
        };

        const repo = service['repo'] as any;
        jest.spyOn(repo, 'findPlanById').mockResolvedValue({
          ...mockPlanRow,
          objectives: [],
          initiatives: [],
          risks: [],
          stakeholders: [],
          resources: [],
          kpis: [],
        });
        jest.spyOn(repo, 'updatePlan').mockResolvedValue({
          ...mockPlanRow,
          status: 'UNDER_REVIEW',
          objectives: [],
          initiatives: [],
          risks: [],
          stakeholders: [],
          resources: [],
          kpis: [],
        });

        const { cacheService } = await import('./CacheService.js');
        (cacheService.del as jest.Mock).mockResolvedValue(undefined);

        const result = await service.updatePlan('plan-001', input, testUserId, testTenantId);

        expect(result?.status).toBe('UNDER_REVIEW');
      });
    });

    describe('deletePlan', () => {
      it('should delete a draft plan', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [mockPlanRow],
          rowCount: 1,
        } as QueryResult);

        // Mock loading relations
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);

        mockClient.query.mockResolvedValueOnce(undefined as any); // BEGIN
        mockClient.query.mockResolvedValueOnce({
          rows: [{ tenant_id: testTenantId }],
          rowCount: 1,
        } as QueryResult); // DELETE
        mockClient.query.mockResolvedValueOnce(undefined as any); // COMMIT

        const { cacheService } = await import('./CacheService.js');
        (cacheService.del as jest.Mock).mockResolvedValue(undefined);

        const result = await service.deletePlan('plan-001', testUserId, testTenantId);

        expect(result).toBe(true);
      });

      it('should not delete an active plan', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [{ ...mockPlanRow, status: 'ACTIVE' }],
          rowCount: 1,
        } as QueryResult);

        // Mock loading relations
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);

        await expect(
          service.deletePlan('plan-001', testUserId, testTenantId),
        ).rejects.toThrow('Cannot delete an active or approved plan');
      });
    });
  });

  describe('Objective Operations', () => {
    describe('createObjective', () => {
      it('should create a new objective', async () => {
        const input: CreateObjectiveInput = {
          planId: 'plan-001',
          name: 'New Objective',
          description: 'Test objective description',
          priority: 'HIGH',
          targetValue: 100,
          unit: 'percent',
          startDate: '2025-01-01',
          targetDate: '2025-06-30',
        };

        // Mock plan exists
        mockPool.query.mockResolvedValueOnce({
          rows: [mockPlanRow],
          rowCount: 1,
        } as QueryResult);

        // Mock relations loading
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);

        // Mock create objective
        mockPool.query.mockResolvedValueOnce({
          rows: [mockObjectiveRow],
          rowCount: 1,
        } as QueryResult);

        // Mock activity log
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as QueryResult);

        // Mock cache invalidation
        const { cacheService } = await import('./CacheService.js');
        (cacheService.del as jest.Mock).mockResolvedValue(undefined);

        const result = await service.createObjective(input, testUserId, testTenantId);

        expect(result).toBeDefined();
        expect(result.id).toBe('obj-001');
        expect(result.name).toBe('Test Objective');
      });

      it('should throw error if plan not found', async () => {
        const input: CreateObjectiveInput = {
          planId: 'nonexistent-plan',
          name: 'New Objective',
          description: 'Test',
          priority: 'HIGH',
          targetValue: 100,
          unit: 'percent',
          startDate: '2025-01-01',
          targetDate: '2025-06-30',
        };

        mockPool.query.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        } as QueryResult);

        await expect(
          service.createObjective(input, testUserId, testTenantId),
        ).rejects.toThrow('Plan not found');
      });
    });

    describe('updateObjectiveProgress', () => {
      it('should update objective progress and status', async () => {
        // Mock findObjectiveById
        mockPool.query.mockResolvedValueOnce({
          rows: [mockObjectiveRow],
          rowCount: 1,
        } as QueryResult);

        // Mock milestones
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);

        // Mock key results
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);

        // Mock update
        mockPool.query.mockResolvedValueOnce({
          rows: [{ ...mockObjectiveRow, current_value: 75, status: 'ON_TRACK' }],
          rowCount: 1,
        } as QueryResult);

        // Mock activity log
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as QueryResult);

        const result = await service.updateObjectiveProgress('obj-001', 75, testUserId);

        expect(result).toBeDefined();
        expect(result?.currentValue).toBe(75);
      });

      it('should mark objective as COMPLETED when target reached', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [mockObjectiveRow],
          rowCount: 1,
        } as QueryResult);

        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);

        mockPool.query.mockResolvedValueOnce({
          rows: [{ ...mockObjectiveRow, current_value: 100, status: 'COMPLETED' }],
          rowCount: 1,
        } as QueryResult);

        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as QueryResult);

        const result = await service.updateObjectiveProgress('obj-001', 100, testUserId);

        expect(result?.status).toBe('COMPLETED');
      });
    });
  });

  describe('Initiative Operations', () => {
    describe('createInitiative', () => {
      it('should create a new initiative', async () => {
        const input: CreateInitiativeInput = {
          planId: 'plan-001',
          objectiveIds: ['obj-001'],
          name: 'New Initiative',
          description: 'Test initiative',
          type: 'ANALYSIS',
          priority: 'HIGH',
          startDate: '2025-01-01',
          endDate: '2025-06-30',
          budget: 10000,
        };

        const mockInitiativeRow = {
          id: 'init-001',
          plan_id: 'plan-001',
          objective_ids: ['obj-001'],
          name: 'New Initiative',
          description: 'Test initiative',
          type: 'ANALYSIS',
          status: 'NOT_STARTED',
          priority: 'HIGH',
          start_date: new Date('2025-01-01'),
          end_date: new Date('2025-06-30'),
          budget: 10000,
          budget_used: 0,
          assigned_to: [],
          risks: [],
          dependencies: [],
          created_by: testUserId,
          created_at: new Date(),
          updated_at: new Date(),
        };

        // Mock plan exists
        mockPool.query.mockResolvedValueOnce({
          rows: [mockPlanRow],
          rowCount: 1,
        } as QueryResult);

        // Mock relations
        for (let i = 0; i < 6; i++) {
          mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        }

        // Mock create initiative
        mockPool.query.mockResolvedValueOnce({
          rows: [mockInitiativeRow],
          rowCount: 1,
        } as QueryResult);

        // Mock activity log
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as QueryResult);

        // Mock cache invalidation
        const { cacheService } = await import('./CacheService.js');
        (cacheService.del as jest.Mock).mockResolvedValue(undefined);

        const result = await service.createInitiative(input, testUserId, testTenantId);

        expect(result).toBeDefined();
        expect(result.id).toBe('init-001');
        expect(result.budget).toBe(10000);
      });
    });
  });

  describe('Risk Operations', () => {
    describe('createRisk', () => {
      it('should create a risk with calculated risk level', async () => {
        const input: CreateRiskInput = {
          planId: 'plan-001',
          name: 'Test Risk',
          description: 'A critical risk',
          category: 'SECURITY',
          likelihood: 4,
          impact: 5,
        };

        const mockRiskRow = {
          id: 'risk-001',
          plan_id: 'plan-001',
          name: 'Test Risk',
          description: 'A critical risk',
          category: 'SECURITY',
          likelihood: 4,
          impact: 5,
          risk_score: 20,
          risk_level: 'CRITICAL',
          status: 'IDENTIFIED',
          contingency_plans: [],
          owner: testUserId,
          identified_at: new Date(),
          last_assessed_at: new Date(),
          review_date: new Date(),
        };

        // Mock plan exists
        mockPool.query.mockResolvedValueOnce({
          rows: [mockPlanRow],
          rowCount: 1,
        } as QueryResult);

        // Mock relations
        for (let i = 0; i < 6; i++) {
          mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        }

        // Mock create risk
        mockPool.query.mockResolvedValueOnce({
          rows: [mockRiskRow],
          rowCount: 1,
        } as QueryResult);

        // Mock activity log
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as QueryResult);

        // Mock cache invalidation
        const { cacheService } = await import('./CacheService.js');
        (cacheService.del as jest.Mock).mockResolvedValue(undefined);

        const eventPromise = new Promise<{ risk: RiskAssessment }>((resolve) => {
          service.on('highRiskAlert', resolve);
        });

        const result = await service.createRisk(input, testUserId, testTenantId);

        expect(result).toBeDefined();
        expect(result.riskLevel).toBe('CRITICAL');
        expect(result.riskScore).toBe(20);

        // Should emit high risk alert
        const event = await eventPromise;
        expect(event.risk.id).toBe('risk-001');
      });
    });
  });

  describe('Analytics & Progress', () => {
    describe('getPlanProgress', () => {
      it('should calculate plan progress correctly', async () => {
        const planWithRelations = {
          ...mockPlanRow,
          objectives: [
            { ...mockObjectiveRow, current_value: 50, target_value: 100, status: 'IN_PROGRESS', milestones: [], keyResults: [] },
            { ...mockObjectiveRow, id: 'obj-002', current_value: 100, target_value: 100, status: 'COMPLETED', milestones: [], keyResults: [] },
          ],
          initiatives: [
            { id: 'init-001', status: 'IN_PROGRESS', milestones: [], deliverables: [] },
          ],
          risks: [
            { id: 'risk-001', riskLevel: 'HIGH', status: 'IDENTIFIED' },
          ],
          stakeholders: [],
          resources: [
            { type: 'BUDGET', allocated: 10000, used: 5000 },
          ],
          kpis: [],
        };

        const repo = service['repo'] as any;
        jest.spyOn(repo, 'findPlanById').mockResolvedValue({
          ...mockPlanRow,
          objectives: [
            {
              ...mockObjectiveRow,
              status: 'ON_TRACK',
              milestones: [{ id: 'ms-001' }],
              keyResults: [],
            },
            {
              ...mockObjectiveRow,
              id: 'obj-002',
              status: 'COMPLETED',
              currentValue: 100,
              targetValue: 100,
              milestones: [{ id: 'ms-002' }],
              keyResults: [],
            },
          ],
          initiatives: [
            { id: 'init-001', status: 'IN_PROGRESS', milestones: [], deliverables: [] },
          ],
          risks: [
            { id: 'risk-001', riskLevel: 'HIGH', status: 'IDENTIFIED' },
          ],
          stakeholders: [],
          resources: [
            { type: 'BUDGET', allocated: 10000, used: 5000 },
          ],
          kpis: [],
        });

        // Mock cache
        const { cacheService } = await import('./CacheService.js');
        (cacheService.get as jest.Mock).mockResolvedValue(null);
        (cacheService.set as jest.Mock).mockResolvedValue(undefined);

        const result = await service.getPlanProgress('plan-001', testTenantId);

        expect(result).toBeDefined();
        expect(result?.planId).toBe('plan-001');
        expect(result?.objectivesProgress.total).toBe(2);
        expect(result?.objectivesProgress.completed).toBe(1);
        expect(result?.initiativesProgress.inProgress).toBe(1);
        expect(result?.riskSummary.high).toBe(1);
        expect(result?.resourceUtilization.budget.allocated).toBe(10000);
        expect(result?.resourceUtilization.budget.used).toBe(5000);
      });
    });

    describe('getPlanTimeline', () => {
      it('should build timeline with all events', async () => {
        // Similar setup as getPlanProgress
        mockPool.query.mockResolvedValueOnce({
          rows: [mockPlanRow],
          rowCount: 1,
        } as QueryResult);

        // Mock empty relations
        for (let i = 0; i < 12; i++) {
          mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        }

        const { cacheService } = await import('./CacheService.js');
        (cacheService.get as jest.Mock).mockResolvedValue(null);
        (cacheService.set as jest.Mock).mockResolvedValue(undefined);

        const result = await service.getPlanTimeline('plan-001', testTenantId);

        expect(result).toBeDefined();
        expect(result?.planId).toBe('plan-001');
        expect(result?.events.length).toBeGreaterThanOrEqual(2); // At least start and end
      });
    });
  });

  describe('Plan Approval Workflow', () => {
    describe('approvePlan', () => {
      it('should approve a plan under review with all requirements met', async () => {
        const planUnderReview = {
          ...mockPlanRow,
          status: 'UNDER_REVIEW',
        };

        const repo = service['repo'] as any;
        jest.spyOn(repo, 'findPlanById').mockResolvedValue({
          ...planUnderReview,
          objectives: [
            {
              ...mockObjectiveRow,
              milestones: [{ id: 'ms-001' }],
              keyResults: [],
            },
          ],
          initiatives: [],
          risks: [],
          stakeholders: [{ id: 'sh-001', role: 'OWNER' }],
          resources: [],
          kpis: [{ id: 'kpi-001', name: 'Test KPI' }],
        });
        jest.spyOn(repo, 'updatePlan').mockResolvedValue({
          ...planUnderReview,
          status: 'APPROVED',
          approvedBy: testUserId,
          approvedAt: new Date(),
          objectives: [],
          initiatives: [],
          risks: [],
          stakeholders: [],
          resources: [],
          kpis: [],
        });

        const { cacheService } = await import('./CacheService.js');
        (cacheService.del as jest.Mock).mockResolvedValue(undefined);

        const result = await service.approvePlan('plan-001', testUserId, testTenantId);

        expect(result?.status).toBe('APPROVED');
      });

      it('should reject approval if plan has no objectives', async () => {
        const planUnderReview = {
          ...mockPlanRow,
          status: 'UNDER_REVIEW',
        };

        // Mock findPlanById with empty objectives
        mockPool.query.mockResolvedValueOnce({
          rows: [planUnderReview],
          rowCount: 1,
        } as QueryResult);

        // Mock empty objectives
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);

        // Mock other relations
        for (let i = 0; i < 5; i++) {
          mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        }

        await expect(
          service.approvePlan('plan-001', testUserId, testTenantId),
        ).rejects.toThrow('Plan cannot be approved');
      });

      it('should reject approval if plan is not under review', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [mockPlanRow], // status is DRAFT
          rowCount: 1,
        } as QueryResult);

        // Mock relations
        for (let i = 0; i < 6; i++) {
          mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as QueryResult);
        }

        await expect(
          service.approvePlan('plan-001', testUserId, testTenantId),
        ).rejects.toThrow('Only plans under review can be approved');
      });
    });
  });
});
