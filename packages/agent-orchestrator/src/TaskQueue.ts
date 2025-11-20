/**
 * Task Queue and Distribution System
 * Manages task queuing, prioritization, and distribution to agents
 */

import Queue, { Job, JobOptions } from 'bull';
import { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';
import {
  Task,
  TaskStatus,
  AgentPriority,
  TaskSchema,
} from '@intelgraph/agent-framework';

export interface TaskQueueConfig {
  redisUrl: string;
  queueName?: string;
  concurrency?: number;
  limiter?: {
    max: number;
    duration: number;
  };
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export class TaskQueue {
  private queue: Queue.Queue;
  private logger: Logger;
  private handlers: Map<string, (task: Task) => Promise<any>>;

  constructor(config: TaskQueueConfig, logger: Logger) {
    this.logger = logger.child({ component: 'TaskQueue' });
    this.handlers = new Map();

    const queueOptions: Queue.QueueOptions = {
      redis: config.redisUrl,
      limiter: config.limiter,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 1000, // Keep last 1000 completed jobs
        removeOnFail: 5000, // Keep last 5000 failed jobs
      },
    };

    this.queue = new Queue(config.queueName || 'agent-tasks', queueOptions);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.queue.on('error', (error) => {
      this.logger.error({ error }, 'Queue error');
    });

    this.queue.on('failed', (job, error) => {
      this.logger.error(
        { jobId: job.id, taskId: job.data.id, error },
        'Task failed',
      );
    });

    this.queue.on('completed', (job) => {
      this.logger.info(
        { jobId: job.id, taskId: job.data.id },
        'Task completed',
      );
    });

    this.queue.on('stalled', (job) => {
      this.logger.warn({ jobId: job.id, taskId: job.data.id }, 'Task stalled');
    });
  }

  /**
   * Add a task to the queue
   */
  async enqueue(
    task: Task,
    options?: Partial<JobOptions>,
  ): Promise<Job<Task>> {
    const validated = TaskSchema.parse(task);

    // Set priority based on task priority
    const priority = this.getPriorityValue(validated.priority);

    const jobOptions: JobOptions = {
      priority,
      jobId: validated.id,
      ...options,
    };

    // Add delay for delayed tasks
    if (validated.metadata?.delayUntil) {
      const delay =
        new Date(validated.metadata.delayUntil).getTime() - Date.now();
      if (delay > 0) {
        jobOptions.delay = delay;
      }
    }

    const job = await this.queue.add(validated, jobOptions);

    this.logger.debug(
      { taskId: validated.id, priority: validated.priority },
      'Task enqueued',
    );

    return job;
  }

  /**
   * Add multiple tasks in bulk
   */
  async enqueueBulk(
    tasks: Task[],
    options?: Partial<JobOptions>,
  ): Promise<Job<Task>[]> {
    const jobs = tasks.map((task) => {
      const validated = TaskSchema.parse(task);
      return {
        data: validated,
        opts: {
          priority: this.getPriorityValue(validated.priority),
          jobId: validated.id,
          ...options,
        },
      };
    });

    const createdJobs = await this.queue.addBulk(jobs);

    this.logger.info({ count: tasks.length }, 'Bulk tasks enqueued');

    return createdJobs;
  }

  /**
   * Register a task handler
   */
  registerHandler(
    taskType: string,
    handler: (task: Task) => Promise<any>,
  ): void {
    this.handlers.set(taskType, handler);
    this.logger.debug({ taskType }, 'Handler registered');
  }

  /**
   * Start processing tasks
   */
  async startProcessing(concurrency = 5): Promise<void> {
    this.queue.process(concurrency, async (job: Job<Task>) => {
      const task = job.data;

      this.logger.info(
        { taskId: task.id, taskType: task.type },
        'Processing task',
      );

      // Update task status
      task.status = TaskStatus.RUNNING;
      task.startedAt = new Date().toISOString();

      try {
        // Get handler for task type
        const handler = this.handlers.get(task.type);
        if (!handler) {
          throw new Error(`No handler registered for task type: ${task.type}`);
        }

        // Execute task
        const result = await handler(task);

        // Update task with result
        task.status = TaskStatus.COMPLETED;
        task.output = result;
        task.completedAt = new Date().toISOString();

        return result;
      } catch (error) {
        task.status = TaskStatus.FAILED;
        task.error = (error as Error).message;
        task.completedAt = new Date().toISOString();

        this.logger.error(
          { taskId: task.id, error },
          'Task execution failed',
        );

        throw error;
      }
    });

    this.logger.info({ concurrency }, 'Task processing started');
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    this.logger.info('Queue paused');
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    this.logger.info('Queue resumed');
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const [waiting, active, completed, failed, delayed, paused] =
      await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
        this.queue.isPaused(),
      ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    };
  }

  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<Task | null> {
    const job = await this.queue.getJob(taskId);
    if (!job) return null;
    return job.data;
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    let jobs: Job<Task>[] = [];

    switch (status) {
      case TaskStatus.PENDING:
      case TaskStatus.QUEUED:
        jobs = await this.queue.getWaiting();
        break;
      case TaskStatus.RUNNING:
        jobs = await this.queue.getActive();
        break;
      case TaskStatus.COMPLETED:
        jobs = await this.queue.getCompleted();
        break;
      case TaskStatus.FAILED:
        jobs = await this.queue.getFailed();
        break;
    }

    return jobs.map((job) => job.data);
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const job = await this.queue.getJob(taskId);
    if (!job) {
      this.logger.warn({ taskId }, 'Task not found for cancellation');
      return false;
    }

    await job.remove();
    this.logger.info({ taskId }, 'Task cancelled');
    return true;
  }

  /**
   * Retry a failed task
   */
  async retryTask(taskId: string): Promise<boolean> {
    const job = await this.queue.getJob(taskId);
    if (!job) {
      this.logger.warn({ taskId }, 'Task not found for retry');
      return false;
    }

    await job.retry();
    this.logger.info({ taskId }, 'Task retry initiated');
    return true;
  }

  /**
   * Clean old completed/failed jobs
   */
  async clean(grace: number, limit: number, type: 'completed' | 'failed'): Promise<Job[]> {
    const jobs = await this.queue.clean(grace, limit, type);
    this.logger.info(
      { count: jobs.length, type, grace },
      'Cleaned old jobs',
    );
    return jobs;
  }

  /**
   * Get priority value for Bull queue (lower number = higher priority)
   */
  private getPriorityValue(priority: AgentPriority): number {
    // Bull uses lower numbers for higher priority
    switch (priority) {
      case AgentPriority.CRITICAL:
        return 1;
      case AgentPriority.HIGH:
        return 2;
      case AgentPriority.NORMAL:
        return 3;
      case AgentPriority.LOW:
        return 4;
      case AgentPriority.BACKGROUND:
        return 5;
      default:
        return 3;
    }
  }

  /**
   * Close the queue
   */
  async close(): Promise<void> {
    await this.queue.close();
    this.logger.info('Queue closed');
  }
}
