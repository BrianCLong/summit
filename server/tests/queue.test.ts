import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { QueueName, JobData } from '../src/queue/types.js';
import { Job } from 'bullmq';
import { JobQueue } from '../src/queue/job-queue.js';

// Mock BullMQ
jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => ({
      add: async () => ({
        id: 'mock-job-id',
        name: 'mock-job',
        data: {},
      }),
      close: async () => undefined,
    })),
    QueueEvents: jest.fn().mockImplementation(() => ({
      on: () => {},
      close: async () => undefined,
      waitUntilReady: async () => undefined,
    })),
    QueueScheduler: jest.fn().mockImplementation(() => ({
      close: async () => undefined,
      waitUntilReady: async () => undefined,
    })),
    Worker: jest.fn().mockImplementation((name, processor) => ({
        on: () => {},
        close: async () => undefined,
        processor
    })),
    FlowProducer: jest.fn().mockImplementation(() => ({
        add: async () => ({
          job: { id: 'flow-job-id' },
          children: [],
        }),
        close: async () => undefined,
    })),
  };
});

// Mock @bull-board/api
jest.mock('@bull-board/api', () => ({
    createBullBoard: jest.fn(),
}));
jest.mock('@bull-board/api/bullMQAdapter', () => ({
    BullMQAdapter: jest.fn(),
}));
jest.mock('@bull-board/express', () => ({
    ExpressAdapter: jest.fn().mockImplementation(() => ({
        setBasePath: jest.fn(),
        getRouter: jest.fn(),
    })),
}));

// Import after mocks
import { workerManager } from '../src/queue/worker.js';

// Mock retention engine
jest.mock('../src/jobs/retention.js', () => ({
  retentionEngine: {
    purgeDataset: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  },
}));

describe('Queue System', () => {
  const queue = new JobQueue({
    name: QueueName.DEFAULT,
    connection: {} as any,
  });

  beforeEach(async () => {
    const { Worker } = await import('bullmq');
    (Worker as jest.Mock).mockImplementation((name, processor) => ({
      on: () => {},
      close: async () => undefined,
      processor,
    }));
  });

  afterAll(async () => {
    await queue.shutdown();
    await workerManager.close();
  });

  it('should add a job to the queue', async () => {
    const jobData: JobData = {
      type: 'test-job',
      payload: { foo: 'bar' },
    };

    const jobId = await queue.enqueue(jobData, { jobName: 'test-job-1' });

    expect(jobId).toBe('mock-job-id');
  });

  it('should register a worker', async () => {
      const processor = jest.fn(async (job: Job) => {
          return { result: job.data.payload.value * 2 };
      });

      workerManager.registerWorker(QueueName.DEFAULT, processor);

      // Since we mocked Worker, we can't really test if it processes the job without simulating events
      // But we can verify that Worker was instantiated
      const { Worker } = await import('bullmq');
      expect(Worker).toHaveBeenCalledWith(QueueName.DEFAULT, processor, expect.any(Object));
  });

  it('should schedule a job', async () => {
    const jobData: JobData = {
      type: 'scheduled-job',
      payload: { foo: 'bar' },
    };
    const scheduledId = await queue.schedule(jobData, {
      at: new Date(Date.now() + 1000),
      jobName: 'scheduled-job',
    });
    expect(scheduledId).toBe('mock-job-id');
  });
});
