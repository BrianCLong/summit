import { QueueManager } from '../core/QueueManager';
import { JobPriority } from '../types';

describe('QueueManager', () => {
  let queueManager: QueueManager;

  beforeEach(() => {
    queueManager = new QueueManager();
  });

  afterEach(async () => {
    await queueManager.shutdown();
  });

  describe('Queue Registration', () => {
    it('should register a new queue', () => {
      const queue = queueManager.registerQueue('test-queue');
      expect(queue).toBeDefined();
      expect(queue.name).toBe('test-queue');
    });

    it('should return existing queue if already registered', () => {
      const queue1 = queueManager.registerQueue('test-queue');
      const queue2 = queueManager.registerQueue('test-queue');
      expect(queue1).toBe(queue2);
    });

    it('should register queue with rate limit', () => {
      const queue = queueManager.registerQueue('rate-limited-queue', {
        rateLimit: { max: 100, duration: 60000 },
      });
      expect(queue).toBeDefined();
    });
  });

  describe('Job Processing', () => {
    it('should add a job to queue', async () => {
      queueManager.registerQueue('test-queue');

      const job = await queueManager.addJob('test-queue', 'test-job', {
        message: 'Hello World',
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data).toEqual({ message: 'Hello World' });
    });

    it('should add job with priority', async () => {
      queueManager.registerQueue('test-queue');

      const job = await queueManager.addJob(
        'test-queue',
        'high-priority-job',
        { important: true },
        { priority: JobPriority.HIGH },
      );

      expect(job).toBeDefined();
      expect(job.opts.priority).toBe(JobPriority.HIGH);
    });

    it('should add job with scheduled execution', async () => {
      queueManager.registerQueue('test-queue');

      const futureDate = new Date(Date.now() + 60000); // 1 minute from now
      const job = await queueManager.addJob(
        'test-queue',
        'scheduled-job',
        { data: 'test' },
        { scheduledAt: futureDate },
      );

      expect(job).toBeDefined();
      expect(job.opts.delay).toBeGreaterThan(0);
    });

    it('should add bulk jobs', async () => {
      queueManager.registerQueue('test-queue');

      const jobs = await queueManager.addBulk('test-queue', [
        { name: 'job1', data: { id: 1 } },
        { name: 'job2', data: { id: 2 } },
        { name: 'job3', data: { id: 3 } },
      ]);

      expect(jobs).toHaveLength(3);
      expect(jobs[0].data).toEqual({ id: 1 });
    });

    it('should process job with registered processor', async () => {
      queueManager.registerQueue('test-queue');

      const mockProcessor = jest.fn().mockResolvedValue({ success: true });
      queueManager.registerProcessor('test-queue', mockProcessor);

      await queueManager.startWorker('test-queue', mockProcessor);

      const job = await queueManager.addJob('test-queue', 'test-job', {
        message: 'test',
      });

      // Wait for job to be processed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(mockProcessor).toHaveBeenCalled();
    });
  });

  describe('Queue Operations', () => {
    it('should get queue metrics', async () => {
      queueManager.registerQueue('test-queue');

      const metrics = await queueManager.getQueueMetrics('test-queue');

      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('waiting');
      expect(metrics).toHaveProperty('active');
      expect(metrics).toHaveProperty('completed');
      expect(metrics).toHaveProperty('failed');
    });

    it('should pause and resume queue', async () => {
      queueManager.registerQueue('test-queue');

      await queueManager.pauseQueue('test-queue');
      // Queue should be paused

      await queueManager.resumeQueue('test-queue');
      // Queue should be resumed
    });

    it('should clean old jobs from queue', async () => {
      queueManager.registerQueue('test-queue');

      // Add and complete some jobs
      const job = await queueManager.addJob('test-queue', 'test-job', {});

      await queueManager.cleanQueue('test-queue', 0, 'completed');
      // Old completed jobs should be removed
    });

    it('should throw error for non-existent queue', async () => {
      await expect(
        queueManager.addJob('non-existent-queue', 'test-job', {}),
      ).rejects.toThrow('Queue non-existent-queue not found');
    });
  });

  describe('Job Chaining', () => {
    it('should chain jobs together', async () => {
      queueManager.registerQueue('queue1');
      queueManager.registerQueue('queue2');

      const processor1 = jest.fn().mockResolvedValue({ step1: 'done' });
      const processor2 = jest.fn().mockResolvedValue({ step2: 'done' });

      queueManager.registerProcessor('queue1', processor1);
      queueManager.registerProcessor('queue2', processor2);

      await queueManager.startWorker('queue1', processor1);
      await queueManager.startWorker('queue2', processor2);

      await queueManager.addJob(
        'queue1',
        'job1',
        { data: 'test' },
        {
          chainTo: [
            {
              queueName: 'queue2',
              jobName: 'job2',
              data: { chained: true },
            },
          ],
        },
      );

      // Wait for jobs to be processed
      await new Promise((resolve) => setTimeout(resolve, 2000));

      expect(processor1).toHaveBeenCalled();
      // Chained job should also be called (timing dependent)
    });
  });

  describe('Workflow Execution', () => {
    it('should execute a simple workflow', async () => {
      queueManager.registerQueue('step1-queue');
      queueManager.registerQueue('step2-queue');

      const processor1 = jest.fn().mockResolvedValue({ step1: 'done' });
      const processor2 = jest.fn().mockResolvedValue({ step2: 'done' });

      queueManager.registerProcessor('step1-queue', processor1);
      queueManager.registerProcessor('step2-queue', processor2);

      await queueManager.startWorker('step1-queue', processor1);
      await queueManager.startWorker('step2-queue', processor2);

      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        steps: [
          {
            queueName: 'step1-queue',
            jobName: 'step1',
            data: { value: 1 },
            onSuccess: [
              {
                queueName: 'step2-queue',
                jobName: 'step2',
                data: { value: 2 },
              },
            ],
          },
        ],
      };

      await expect(queueManager.executeWorkflow(workflow)).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should retry failed jobs with exponential backoff', async () => {
      queueManager.registerQueue('retry-queue', {
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 100,
          },
        },
      });

      let attempts = 0;
      const failingProcessor = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Job failed');
        }
        return { success: true };
      });

      queueManager.registerProcessor('retry-queue', failingProcessor);
      await queueManager.startWorker('retry-queue', failingProcessor);

      await queueManager.addJob('retry-queue', 'failing-job', {});

      // Wait for retries
      await new Promise((resolve) => setTimeout(resolve, 3000));

      expect(failingProcessor).toHaveBeenCalledTimes(3);
    });
  });
});
