import { QueueManager } from '../core/QueueManager.js';
import { FatalJobError } from '../core/errors.js';

const mockQueues: Record<string, any[]> = {};

jest.mock('ioredis', () => {
  class FakeRedis {
    store = new Map<string, { value: string; ttl: number; expires: number }>();

    async set(key: string, value: string, _px: any, ttl: number, mode: string) {
      const existing = this.store.get(key);
      if (mode === 'NX' && existing) return null;
      if (mode === 'XX' && !existing) return null;
      this.store.set(key, { value, ttl, expires: Date.now() + ttl });
      return 'OK';
    }

    async eval(_script: string, _keys: number, key: string, expected: string) {
      const entry = this.store.get(key);
      if (entry?.value === expected) {
        this.store.delete(key);
        return 1;
      }
      return 0;
    }

    async quit() {}
  }

  return {
    __esModule: true,
    default: jest.fn(() => new FakeRedis()),
  };
});

jest.mock('bullmq', () => {
  class MockQueue {
    name: string;
    constructor(name: string) {
      this.name = name;
      mockQueues[this.name] = mockQueues[this.name] || [];
    }

    async add(name: string, data: any, opts: any = {}) {
      const queue = (mockQueues[this.name] = mockQueues[this.name] || []);
      const job = {
        id: opts.jobId || `${this.name}:${queue.length + 1}`,
        name,
        data,
        opts: { attempts: opts.attempts ?? 3, ...opts },
        attemptsMade: 0,
        queueName: this.name,
        remove: async () => {
          mockQueues[this.name] = (mockQueues[this.name] || []).filter((j) => j.id !== job.id);
        },
      };
      queue.push(job);
      return job;
    }

    async addBulk(_jobs: any[]) {
      return [];
    }

    async getJob(id: string) {
      return (mockQueues[this.name] || []).find((job) => job.id === id);
    }

    async getJobs(_status: string[], start: number, end: number) {
      return (mockQueues[this.name] || []).slice(start, end);
    }

    async getJobCounts() {
      return {
        waiting: (mockQueues[this.name] || []).length,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
      };
    }

    async pause() {}
    async resume() {}
    async close() {}
    async obliterate() {}
    async clean() {}
  }

  class MockWorker {
    on = jest.fn();
    constructor(
      public name: string,
      public processor: (job: any) => Promise<any>,
      public opts: any,
    ) {}
    async close() {}
  }

  class MockQueueEvents {
    on = jest.fn();
    async close() {}
  }

  return {
    Queue: MockQueue,
    Worker: MockWorker,
    QueueEvents: MockQueueEvents,
  };
});

describe('QueueManager leasing + DLQ', () => {
  beforeEach(() => {
    process.env.LEASED_JOBS = '1';
    for (const key of Object.keys(mockQueues)) {
      mockQueues[key] = [];
    }
  });

  afterEach(async () => {
  });

  it('expires leases and treats the job as retryable when lease renewals fail', async () => {
    const queueManager = new QueueManager();
    queueManager.registerQueue('lease-queue');
    (queueManager as any).leaseDurationMs = 20;
    (queueManager as any).leaseRenewIntervalMs = 5;

    const leaseManager = (queueManager as any).leaseManager!;
    jest.spyOn(leaseManager, 'renew').mockResolvedValue(false);

    const wrapped = (queueManager as any).buildProcessor(
      'lease-queue',
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 15));
      },
    );

    const job = {
      id: 'lease-job-1',
      name: 'lease-job',
      data: {},
      queueName: 'lease-queue',
      opts: { attempts: 2 },
      attemptsMade: 0,
    } as any;

    await expect(wrapped(job)).rejects.toBeInstanceOf(Error);

    const metrics = await queueManager.getQueueMetrics('lease-queue');
    expect(metrics.retries).toBe(1);
    expect(metrics.leaseExpirations).toBe(1);

    await queueManager.shutdown();
  });

  it('sends fatal errors to the dead-letter queue and allows requeue', async () => {
    const queueManager = new QueueManager();
    queueManager.registerQueue('work-queue');

    const wrapped = (queueManager as any).buildProcessor(
      'work-queue',
      async () => {
        throw new FatalJobError('poison pill');
      },
    );

    const job = {
      id: 'poison-1',
      name: 'poison',
      data: { payload: true },
      queueName: 'work-queue',
      opts: { attempts: 1 },
      attemptsMade: 0,
    } as any;

    await expect(wrapped(job)).rejects.toBeInstanceOf(FatalJobError);

    const dlqEntries = await queueManager.listDeadLetterJobs('poison');
    expect(dlqEntries).toHaveLength(1);
    const entry = dlqEntries[0]!;
    expect(entry.fatal).toBe(true);
    expect(entry.originalQueue).toBe('work-queue');

    const requeued = await queueManager.requeueFromDeadLetter(entry.jobId);
    expect(requeued.queueName).toBe('work-queue');

    const metrics = await queueManager.getQueueMetrics('work-queue');
    expect(metrics.deadLetters).toBe(1);
    expect(metrics.deadLetterRate).toBeGreaterThanOrEqual(0);

    await queueManager.shutdown();
  });
});
