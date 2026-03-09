import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { PipelineSmokeService } from '../../services/PipelineSmokeService.js';
import { runsRepo } from '../../maestro/runs/runs-repo.js';

// Mock dependencies
jest.mock('../../maestro/runs/runs-repo.js');
jest.mock('../../utils/metrics.js', () => ({
  PrometheusMetrics: jest.fn().mockImplementation(() => ({
    createCounter: jest.fn(),
    createGauge: jest.fn(),
    createHistogram: jest.fn(),
    setGauge: jest.fn(),
    incrementCounter: jest.fn(),
    observeHistogram: jest.fn(),
  })),
}));

describe('PipelineSmokeService', () => {
  let service: PipelineSmokeService;

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

    // Mock create
    (runsRepo.create as jest.Mock).mockResolvedValue(mockRun);

    // Mock polling: succeeded on first poll
    (runsRepo.get as jest.Mock).mockResolvedValueOnce({
      ...mockRun,
      status: 'succeeded',
      output_data: { foo: 'bar' },
    });

    const result = await service.runSmokeTest(tenantId, 'smoke-test-pipeline', 1000);

    expect(result.success).toBe(true);
    expect(result.runId).toBe('run-123');
    expect(result.stages.creation).toBe(true);
    expect(result.stages.completion).toBe(true);
    expect(runsRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      tenant_id: tenantId,
      input_params: expect.objectContaining({ synthetic: true }),
    }));
  });

  it('should handle creation failure', async () => {
    (runsRepo.create as jest.Mock).mockResolvedValue(null);

    const result = await service.runSmokeTest('test-tenant', 'smoke-test-pipeline', 1000);

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

    (runsRepo.create as jest.Mock).mockResolvedValue(mockRun);
    (runsRepo.get as jest.Mock).mockResolvedValue({
      ...mockRun,
      status: 'failed',
      error_message: 'Pipeline exploded'
    });

    const result = await service.runSmokeTest(tenantId, 'smoke-test-pipeline', 1000);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Run failed with status: failed');
  });
});
