import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { QueueName, JobData } from '../src/queue/types.js';
import { Job } from 'bullmq';

// Mock BullMQ
jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockResolvedValue({ id: 'mock-job-id', name: 'mock-job', data: {} }),
      close: jest.fn().mockResolvedValue(undefined),
    })),
    QueueEvents: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    })),
    Worker: jest.fn().mockImplementation((name, processor) => ({
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
        processor
    })),
    FlowProducer: jest.fn().mockImplementation(() => ({
        add: jest.fn().mockResolvedValue({ job: { id: 'flow-job-id' }, children: [] }),
        close: jest.fn().mockResolvedValue(undefined),
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
import { queueManager } from '../src/queue/index.js';
import { workerManager } from '../src/queue/worker.js';

// Mock retention engine
jest.mock('../src/jobs/retention.js', () => ({
  retentionEngine: {
    purgeDataset: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Queue System', () => {
  afterAll(async () => {
    await queueManager.close();
    await workerManager.close();
  });

  it('should add a job to the queue', async () => {
    const jobData: JobData = {
      type: 'test-job',
      payload: { foo: 'bar' },
    };

    const job = await queueManager.addJob(QueueName.DEFAULT, 'test-job-1', jobData);

    expect(job).toBeDefined();
    expect(job?.id).toBe('mock-job-id');
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

  it('should add a flow', async () => {
      const flow = {
          name: 'parent-job',
          queueName: QueueName.DEFAULT,
          data: {},
          children: [
              { name: 'child-job', queueName: QueueName.DEFAULT, data: {} }
          ]
      };

      const result = await queueManager.addFlow(flow);
      expect(result).toBeDefined();
      expect(result.job.id).toBe('flow-job-id');
  });
});
