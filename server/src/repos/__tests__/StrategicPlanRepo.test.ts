
import { jest } from '@jest/globals';
import { StrategicPlanRepo } from '../StrategicPlanRepo.js';

describe('StrategicPlanRepo Batch Loading', () => {
  let repo: StrategicPlanRepo;
  let mockPg: any;

  beforeEach(() => {
    mockPg = {
      query: jest.fn(),
    };
    repo = new StrategicPlanRepo(mockPg);
  });

  it('getMilestonesByParents should fetch milestones for multiple parents', async () => {
    const parentIds = ['p1', 'p2'];
    mockPg.query.mockResolvedValueOnce({
      rows: [
        { id: 'm1', parent_id: 'p1', parent_type: 'objective', name: 'M1', due_date: new Date() },
        { id: 'm2', parent_id: 'p2', parent_type: 'objective', name: 'M2', due_date: new Date() },
      ],
    });

    const result = await repo.getMilestonesByParents(parentIds, 'objective');

    expect(mockPg.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE parent_id = ANY($1)'),
      [parentIds, 'objective']
    );
    expect(result.get('p1')).toHaveLength(1);
    expect(result.get('p2')).toHaveLength(1);
    expect(result.get('p1')![0].id).toBe('m1');
  });

  it('getObjectivesByPlan should use batch loading for Key Results and Milestones', async () => {
    mockPg.query
      .mockResolvedValueOnce({ // Objectives query
        rows: [
          { id: 'obj-1', plan_id: 'plan-1', name: 'Obj 1', target_value: 100, current_value: 0 },
        ],
      })
      .mockResolvedValueOnce({ // Milestones batch query
        rows: [{ id: 'm1', parent_id: 'obj-1', parent_type: 'objective', name: 'M1' }],
      })
      .mockResolvedValueOnce({ // Key Results batch query
        rows: [{ id: 'kr-1', objective_id: 'obj-1', description: 'KR 1' }],
      });

    const objectives = await repo.getObjectivesByPlan('plan-1');

    expect(objectives).toHaveLength(1);
    expect(objectives[0].milestones).toHaveLength(1);
    expect(objectives[0].keyResults).toHaveLength(1);
    expect(mockPg.query).toHaveBeenCalledTimes(3);
  });
});
