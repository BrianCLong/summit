import { jest } from '@jest/globals';
import { QueueWorker } from '../queue-worker';
import { costAwareScheduler } from '../cost-aware-scheduler';
import { prometheusConductorMetrics } from '../../observability/prometheus';

jest.mock('../cost-aware-scheduler', () => ({
  costAwareScheduler: {
    getNextTask: jest.fn(),
    completeTask: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    failTask: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  },
}));

jest.mock('../../observability/prometheus', () => ({
  prometheusConductorMetrics: {
    recordOperationalEvent: jest.fn(),
    recordOperationalMetric: jest.fn(),
    recordScheduledTask: jest.fn(),
    observeScheduledTaskLatency: jest.fn(),
  },
}));

const mockCompleteTask = costAwareScheduler.completeTask as jest.Mock;
const mockFailTask = costAwareScheduler.failTask as jest.Mock;
const mockRecordOperationalEvent =
  prometheusConductorMetrics.recordOperationalEvent as jest.Mock;
const mockRecordOperationalMetric =
  prometheusConductorMetrics.recordOperationalMetric as jest.Mock;

describe('queue-worker pool labeling', () => {
  const config = {
    workerId: 'worker-1',
    expertType: 'light' as const,
    queueNames: ['light_normal'],
    concurrency: 1,
    pollInterval: 0,
    maxRetries: 1,
    shutdownTimeout: 1000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses unknown pool label when poolId is absent', async () => {
    const worker = new QueueWorker(config);
    (worker as any).executeTask = jest.fn<() => Promise<any>>().mockResolvedValue({
      success: true,
      actualCost: 0.5,
      processingTime: 25,
    });

    await (worker as any).processTask('worker-1', 'light_normal', {
      expertType: 'general_llm',
      priority: 'normal',
      estimatedCost: 0.01,
      estimatedDuration: 1000,
      tenantId: 'tenant-1',
      requestId: 'req-1',
      timeout: 1000,
    });

    expect(mockCompleteTask).toHaveBeenCalled();
    expect(mockRecordOperationalEvent).toHaveBeenCalledWith(
      'worker_task_completed',
      { success: true },
    );
    expect(mockRecordOperationalMetric).toHaveBeenCalledWith(
      'worker_task_success_rate',
      1,
    );
  });

  it('tags metrics with provided poolId', async () => {
    const worker = new QueueWorker(config);
    (worker as any).executeTask = jest.fn<() => Promise<any>>().mockResolvedValue({
      success: false,
      error: 'boom',
      actualCost: 0,
      processingTime: 10,
    });

    await (worker as any).processTask('worker-1', 'light_normal', {
      expertType: 'general_llm',
      priority: 'normal',
      estimatedCost: 0.01,
      estimatedDuration: 1000,
      tenantId: 'tenant-2',
      requestId: 'req-2',
      timeout: 1000,
      poolId: 'pool-123',
      poolPriceUsd: 0.12,
    });

    expect(mockFailTask).toHaveBeenCalled();
    expect(mockRecordOperationalEvent).toHaveBeenCalledWith(
      'worker_task_failed',
      { success: false },
    );
    expect(mockRecordOperationalMetric).toHaveBeenCalledWith(
      'worker_task_success_rate',
      0,
    );
  });
});
