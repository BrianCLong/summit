import { EventEmitter } from 'node:events';
import { jest } from '@jest/globals';
import { JobQueue } from '../job-queue.js';

type MockJobOpts = {
  jobId?: string;
  attempts?: number;
  delay?: number;
  priority?: number;
  repeat?: unknown;
  lifo?: boolean;
};

type MockJob<T = unknown> = {
  id: string;
  name: string;
  data: T;
  opts: MockJobOpts;
  attemptsMade: number;
  failedReason?: string;
  returnvalue?: unknown;
  timestamp?: number;
  processedOn?: number;
  finishedOn?: number;
  stacktrace?: string[];
  state?: string;
  progress?: number;
  getState: () => Promise<string>;
  progressValue: () => Promise<number | undefined>;
};

const mockState = {
  queues: new Map<string, any>(),
  workers: [] as EventEmitter[],
};

jest.mock('bullmq', () => {
  class MockQueue<T = unknown> {
    name: string;
    jobs: Map<string, MockJob<T>> = new Map();
    getJobCounts = jest.fn(async () => ({
      waiting: [...this.jobs.values()].filter((job) => job.state !== 'failed').length,
      active: 0,
      completed: [...this.jobs.values()].filter((job) => job.state === 'completed').length,
      failed: [...this.jobs.values()].filter((job) => job.state === 'failed').length,
      delayed: [...this.jobs.values()].filter((job) => Boolean(job.opts.delay)).length,
    }));
    add = jest.fn(async (jobName: string, data: T, opts: MockJobOpts = {}) => {
      const job: MockJob<T> = {
        id: opts.jobId ?? `${jobName}-${this.jobs.size + 1}`,
        name: jobName,
        data,
        opts,
        attemptsMade: opts.attemptsMade ?? 0,
        timestamp: Date.now(),
        progress: 0,
        getState: async () => job.state ?? 'waiting',
        progressValue: async () => job.progress,
      };
      this.jobs.set(job.id, job);
      return job;
    });

    constructor(name: string) {
      this.name = name;
      mockState.queues.set(name, this);
    }

    async getJob(id: string) {
      return this.jobs.get(id) ?? null;
    }

    async getWaitingCount() {
      return [...this.jobs.values()].filter((job) => job.state !== 'failed').length;
    }

    async getActiveCount() {
      return 0;
    }

    async getCompletedCount() {
      return 0;
    }

    async getFailedCount() {
      return [...this.jobs.values()].filter((job) => job.state === 'failed').length;
    }

    async getDelayedCount() {
      return [...this.jobs.values()].filter((job) => Boolean(job.opts.delay)).length;
    }

    async pause() {}

    async resume() {}

    async close() {}
  }

  class MockQueueEvents extends EventEmitter {
    async waitUntilReady() {}
    async close() {}
  }

  class MockQueueScheduler {
    constructor() {}

    async waitUntilReady() {}

    async close() {}
  }

  class MockWorker<T> extends EventEmitter {
    constructor(public name: string, public processor: (job: MockJob<T>) => Promise<any>) {
      super();
      mockState.workers.push(this);
    }

    async pause() {}

    async resume() {}

    async close() {}
  }

  return {
    Queue: MockQueue,
    QueueEvents: MockQueueEvents,
    QueueScheduler: MockQueueScheduler,
    Worker: MockWorker,
  };
});

jest.mock('../../db/redis', () => ({
  getRedisClient: jest.fn(() => ({
    on: jest.fn(),
    quit: jest.fn(),
  })),
}));

const getMockQueue = (name: string) => mockState.queues.get(name);

describe('JobQueue', () => {
  beforeEach(() => {
    mockState.queues.clear();
    mockState.workers.length = 0;
  });

  it('enqueues jobs with priority, retry, and delay options', async () => {
    const queue = new JobQueue<{ task: string }>({
      name: 'priority-queue',
      deadLetterQueueName: 'priority-dlq',
    });

    const jobId = await queue.enqueue({ task: 'compute' }, {
      priority: 1,
      attempts: 4,
      delay: 1500,
      backoff: { type: 'exponential', delay: 500 },
    });

    const mockQueue = getMockQueue('priority-queue');
    const storedJob = mockQueue.jobs.get(jobId) as MockJob;

    expect(storedJob.opts.priority).toBe(1);
    expect(storedJob.opts.attempts).toBe(4);
    expect(storedJob.opts.delay).toBe(1500);
    expect(storedJob.opts.backoff).toEqual({ type: 'exponential', delay: 500 });
  });

  it('routes exhausted jobs to a dead-letter queue', async () => {
    const queue = new JobQueue<{ task: string }>({
      name: 'retry-queue',
      deadLetterQueueName: 'retry-dlq',
    });

    await queue.start(async () => {
      throw new Error('boom');
    });

    const jobId = await queue.enqueue({ task: 'explode' }, { attempts: 2 });
    const mainQueue = getMockQueue('retry-queue');
    const worker = mockState.workers[0];
    const failedJob = mainQueue.jobs.get(jobId) as MockJob;

    failedJob.attemptsMade = 2;
    worker.emit('failed', failedJob, new Error('boom'));

    const deadLetterQueue = getMockQueue('retry-dlq');
    expect(deadLetterQueue.add).toHaveBeenCalledWith('retry-queue:dead-letter', expect.any(Object));
  });

  it('supports scheduling with future timestamps', async () => {
    const queue = new JobQueue<{ task: string }>({ name: 'scheduled-queue' });
    const future = new Date(Date.now() + 5000);

    const jobId = await queue.schedule({ task: 'later' }, { at: future, priority: 3 });
    const mockQueue = getMockQueue('scheduled-queue');
    const storedJob = mockQueue.jobs.get(jobId) as MockJob;

    expect(storedJob.opts.delay).toBeGreaterThanOrEqual(0);
    expect(storedJob.opts.priority).toBe(3);
  });

  it('forwards progress updates from workers', async () => {
    const queue = new JobQueue<{ task: string }>({ name: 'progress-queue' });
    await queue.start(async () => 'ok');

    const jobId = await queue.enqueue({ task: 'run' });
    const worker = mockState.workers[0];
    const job = getMockQueue('progress-queue').jobs.get(jobId) as MockJob;

    const listener = jest.fn();
    const unsubscribe = queue.onProgress(listener);

    worker.emit('progress', job, 42);

    expect(listener).toHaveBeenCalledWith({ jobId, progress: 42 });
    unsubscribe();
  });

  it('waits for schedulers to be ready and exposes metrics and job details', async () => {
    const queue = new JobQueue<{ task: string }>({ name: 'metrics-queue' });

    await queue.start(async (job) => {
      job.progress = 50;
      (job as any).returnvalue = 'done';
      job.state = 'completed';
      return 'done';
    });

    const jobId = await queue.enqueue({ task: 'count' }, { delay: 10 });
    const mockQueue = getMockQueue('metrics-queue');
    const storedJob = mockQueue.jobs.get(jobId) as MockJob;
    storedJob.state = 'completed';
    storedJob.finishedOn = Date.now();

    const metrics = await queue.metrics();
    expect(metrics.waiting).toBe(0);
    expect(metrics.delayed).toBe(1);

    const details = await queue.getJobDetails(jobId);
    expect(details).toMatchObject({
      id: jobId,
      progress: 50,
      returnValue: 'done',
      state: 'completed',
    });
  });
});
