import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

const mockRunsRepo = {
  create: jest.fn(),
  get: jest.fn(),
  list: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getByPipeline: jest.fn(),
  getRunForTenant: jest.fn(),
};

const mockMetrics = {
  createCounter: jest.fn(),
  createGauge: jest.fn(),
  createHistogram: jest.fn(),
  setGauge: jest.fn(),
  incrementCounter: jest.fn(),
  observeHistogram: jest.fn(),
};

jest.unstable_mockModule('../../maestro/runs/runs-repo.js', () => ({
  runsRepo: mockRunsRepo,
}));

jest.unstable_mockModule('../../utils/metrics.js', () => ({
  PrometheusMetrics: jest.fn().mockImplementation(() => mockMetrics),
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  },
}));

describe('PipelineSmokeService', () => {
  let service: any;
  let PipelineSmokeService: any;

  beforeAll(async () => {
    const module = await import('../../services/PipelineSmokeService.js');
    PipelineSmokeService = module.PipelineSmokeService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = PipelineSmokeService.getInstance();
  });

  it('should run a successful smoke test', async () => {
    const tenantId = 'test-tenant';
    const mockRun = {
      id: 'run-123',
      pipeline_id: 'smoke-test-pipeline',
      status: 'queued',
      created_at: new Date(),
      updated_at: new Date(),
      tenant_id: tenantId,
    };

    mockRunsRepo.create.mockResolvedValue(mockRun);
    mockRunsRepo.get.mockResolvedValueOnce({
      ...mockRun,
      status: 'succeeded',
      output_data: { foo: 'bar' },
    });

    const result = await service.runSmokeTest(
      tenantId,
      'smoke-test-pipeline',
      1000,
    );

    expect(result.success).toBe(true);
    expect(result.runId).toBe('run-123');
    expect(result.stages.creation).toBe(true);
    expect(result.stages.completion).toBe(true);
    expect(mockRunsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenantId,
        input_params: expect.objectContaining({ synthetic: true }),
      }),
    );
  });

  it('should handle creation failure', async () => {
    mockRunsRepo.create.mockResolvedValue(null);

    const result = await service.runSmokeTest(
      'test-tenant',
      'smoke-test-pipeline',
      1000,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to create run');
  });

  it('should handle run failure', async () => {
    const tenantId = 'test-tenant';
    const mockRun = {
      id: 'run-123',
      pipeline_id: 'smoke-test-pipeline',
      status: 'queued',
      created_at: new Date(),
      updated_at: new Date(),
      tenant_id: tenantId,
    };

    mockRunsRepo.create.mockResolvedValue(mockRun);
    mockRunsRepo.get.mockResolvedValue({
      ...mockRun,
      status: 'failed',
      error_message: 'Pipeline exploded',
    });

    const result = await service.runSmokeTest(
      tenantId,
      'smoke-test-pipeline',
      1000,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Run failed with status: failed');
  });
});
