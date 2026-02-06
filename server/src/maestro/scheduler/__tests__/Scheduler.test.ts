import { describe, it, expect, jest } from '@jest/globals';
import { MaestroScheduler } from '../Scheduler.js';
import { QueueHelper } from '../QueueHelper.js';

const makeLogger = () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

describe('MaestroScheduler', () => {
  it('deduplicates queued runs by id', async () => {
    const logger = makeLogger();
    const scheduler = MaestroScheduler.createForTesting({
      queueHelper: new QueueHelper(),
      runsRepo: {
        listByStatus: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      } as any,
      executorsRepo: {
        list: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      } as any,
      logger: logger as any,
    });

    await scheduler.enqueueRun('run-1', 'tenant-a');
    await scheduler.enqueueRun('run-1', 'tenant-a');

    expect(scheduler.getQueueStatus().size).toBe(1);
  });

  it('recovers queued runs into the scheduler queue', async () => {
    const logger = makeLogger();
    const scheduler = MaestroScheduler.createForTesting({
      queueHelper: new QueueHelper(),
      runsRepo: {
        listByStatus: jest.fn().mockResolvedValue([
          { id: 'run-2', tenant_id: 'tenant-b' },
          { id: 'run-3', tenant_id: 'tenant-c' },
        ]),
        update: jest.fn(),
      } as any,
      executorsRepo: {
        list: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      } as any,
      logger: logger as any,
    });

    await scheduler.triggerRecovery();

    expect(scheduler.getQueueStatus().size).toBe(2);
  });
});
