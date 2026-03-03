import { jest } from '@jest/globals';
import { StrategicPlanRepo } from '../StrategicPlanRepo.js';
import { Pool } from 'pg';

describe('StrategicPlanRepo Performance Benchmark', () => {
  let mockPool: jest.Mocked<Pool>;
  let repo: StrategicPlanRepo;
  let queryCount = 0;

  beforeEach(() => {
    queryCount = 0;
    mockPool = {
      query: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
        queryCount++;
        // Return minimal mock data based on the query
        if (sql.includes('strategic_initiatives')) {
          return {
            rows: [
              { id: 'init-1', plan_id: 'plan-1', name: 'Init 1', objective_ids: [], type: 'COLLECTION', status: 'IN_PROGRESS', priority: 'HIGH', start_date: new Date(), end_date: new Date() },
              { id: 'init-2', plan_id: 'plan-1', name: 'Init 2', objective_ids: [], type: 'ANALYSIS', status: 'IN_PROGRESS', priority: 'MEDIUM', start_date: new Date(), end_date: new Date() },
              { id: 'init-3', plan_id: 'plan-1', name: 'Init 3', objective_ids: [], type: 'DISSEMINATION', status: 'IN_PROGRESS', priority: 'LOW', start_date: new Date(), end_date: new Date() },
            ],
          };
        }
        if (sql.includes('strategic_risks')) {
          return {
            rows: [
              { id: 'risk-1', plan_id: 'plan-1', name: 'Risk 1', category: 'OPERATIONAL', likelihood: 3, impact: 4, risk_score: 12, risk_level: 'HIGH', status: 'IDENTIFIED', identified_at: new Date(), last_assessed_at: new Date(), review_date: new Date(), contingency_plans: [], owner: 'user-1' },
              { id: 'risk-2', plan_id: 'plan-1', name: 'Risk 2', category: 'SECURITY', likelihood: 2, impact: 5, risk_score: 10, risk_level: 'MEDIUM', status: 'IDENTIFIED', identified_at: new Date(), last_assessed_at: new Date(), review_date: new Date(), contingency_plans: [], owner: 'user-1' },
            ],
          };
        }
        if (sql.includes('strategic_milestones')) {
          return { rows: [{ id: 'ms-1', name: 'Milestone' }] };
        }
        if (sql.includes('strategic_deliverables')) {
          return { rows: [{ id: 'del-1', name: 'Deliverable' }] };
        }
        if (sql.includes('strategic_mitigations')) {
          return { rows: [{ id: 'mit-1', description: 'Mitigation' }] };
        }
        return { rows: [] };
      }),
    } as any;

    repo = new StrategicPlanRepo(mockPool);
  });

  it('should measure query count for getObjectivesByPlan (Optimized: O(1))', async () => {
    mockPool.query.mockImplementationOnce(async () => {
      queryCount++;
      return {
        rows: [
          { id: 'obj-1', plan_id: 'plan-1', name: 'Obj 1', target_value: 100, current_value: 0, unit: 'units' },
          { id: 'obj-2', plan_id: 'plan-1', name: 'Obj 2', target_value: 100, current_value: 0, unit: 'units' },
        ],
      };
    });

    const objectives = await repo.getObjectivesByPlan('plan-1');
    console.log(`[Benchmark] getObjectivesByPlan objectives: ${objectives.length}, queries: ${queryCount}`);

    // Optimized: 1 (objectives) + 1 (milestones) + 1 (key results) = 3 queries
    // Previous: 1 query (but unhydrated)
    expect(queryCount).toBe(3);
    expect(objectives[0].milestones).toBeDefined();
    expect(objectives[0].keyResults).toBeDefined();
  });

  it('should measure query count for getInitiativesByPlan (Optimized: O(1))', async () => {
    const initiatives = await repo.getInitiativesByPlan('plan-1');
    console.log(`[Benchmark] getInitiativesByPlan initiatives: ${initiatives.length}, queries: ${queryCount}`);

    // Optimized: 1 (initiatives) + 1 (milestones) + 1 (deliverables) = 3 queries
    // Previous: 1 + N*2 = 1 + 3*2 = 7 queries
    expect(queryCount).toBe(3);
  });

  it('should measure query count for getRisksByPlan (Optimized: O(1))', async () => {
    const risks = await repo.getRisksByPlan('plan-1');
    console.log(`[Benchmark] getRisksByPlan risks: ${risks.length}, queries: ${queryCount}`);

    // Optimized: 1 (risks) + 1 (mitigations) = 2 queries
    // Previous: 1 + N*1 = 1 + 2*1 = 3 queries
    expect(queryCount).toBe(2);
  });
});
