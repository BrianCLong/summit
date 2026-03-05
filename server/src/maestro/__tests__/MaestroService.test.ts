import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRunsRepo = {
  list: jest.fn(),
};

jest.unstable_mockModule('../runs/runs-repo.js', () => ({
  runsRepo: mockRunsRepo,
}));

describe('MaestroService', () => {
  let MaestroService: any;
  let service: any;

  beforeAll(async () => {
    const module = await import('../MaestroService.js');
    MaestroService = module.MaestroService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = MaestroService.getInstance();
    // Reset private cache for test isolation.
    (service as { dbCache: null }).dbCache = null;
  });

  it('should calculate health snapshot correctly', async () => {
    const now = new Date();
    mockRunsRepo.list.mockResolvedValue([
      {
        id: 'run-1',
        pipeline_id: 'pipe-1',
        pipeline: 'pipeline-a',
        status: 'succeeded',
        cost: 0,
        created_at: now,
        updated_at: now,
        tenant_id: 'tenant-1',
      },
      {
        id: 'run-2',
        pipeline_id: 'pipe-1',
        pipeline: 'pipeline-a',
        status: 'succeeded',
        cost: 0,
        created_at: now,
        updated_at: now,
        tenant_id: 'tenant-1',
      },
    ]);

    const snapshot = await service.getHealthSnapshot('tenant-1');
    expect(snapshot.overallScore).toBe(100);
    expect(snapshot.workstreams[0].status).toBe('healthy');
  });

  it('should degrade health on failures', async () => {
    const now = new Date();
    const failures = Array(10).fill({
      id: 'run-fail',
      pipeline_id: 'pipe-1',
      pipeline: 'pipeline-a',
      status: 'failed',
      cost: 0,
      created_at: now,
      updated_at: now,
      tenant_id: 'tenant-1',
    });

    mockRunsRepo.list.mockResolvedValue(failures);

    const snapshot = await service.getHealthSnapshot('tenant-1');
    expect(snapshot.overallScore).toBeLessThan(90);
  });

  it('should toggle autonomic loops', async () => {
    const result = await service.toggleLoop('cost-optimization', 'paused', 'user-1');
    expect(result).toBe(true);

    const loop = (await service.getControlLoops()).find(
      (entry: { id: string }) => entry.id === 'cost-optimization',
    );
    expect(loop?.status).toBe('paused');
  });
});
