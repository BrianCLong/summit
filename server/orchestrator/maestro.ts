import {
  Queue,
  Worker,
  QueueEvents,
  Job,
  QueueOptions,
  WorkerOptions,
} from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { PolicyGuard } from './policyGuard';
import { Budget } from '../ai/llmBudget';
import { tasksRepo } from '../src/maestro/runs/tasks-repo.js';
import { runsRepo } from '../src/maestro/runs/runs-repo.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const queueOptions: QueueOptions = {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 10,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
};

const maestroQueue = new Queue('maestro', queueOptions);
const queueEvents = new QueueEvents('maestro', { connection: redis });

export class WaitingForDependenciesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WaitingForDependenciesError';
  }
}

export type AgentTask = {
  runId: string;
  tenantId: string;
  taskId?: string; // Optional: internal DB ID
  kind: 'plan' | 'scaffold' | 'implement' | 'test' | 'review' | 'docs';
  repo: string;
  pr?: number;
  issue: string;
  budgetUSD: number;
  context: Record<string, any>;
  parentTaskId?: string;
  dependencies?: string[];
  metadata: {
    actor: string;
    timestamp: string;
    sprint_version: string;
  };
};

export type TaskResult = {
  success: boolean;
  output?: any;
  cost: number;
  duration: number;
  errors?: string[];
  artifacts?: string[];
  nextTasks?: Omit<AgentTask, 'budgetUSD'>[];
};

class MaestroOrchestrator {
  private policyGuard: PolicyGuard;
  private workers: Map<string, Worker> = new Map();

  constructor() {
    this.policyGuard = new PolicyGuard();
    this.initializeWorkers();
    this.setupEventHandlers();
  }

  async enqueueTask(task: AgentTask): Promise<string> {
    // Pre-flight policy check
    const policyResult = await this.policyGuard.checkPolicy(task);
    if (!policyResult.allowed) {
      throw new Error(`Task blocked by policy: ${policyResult.reason}`);
    }

    // Persist to TasksRepo
    const dbTask = await tasksRepo.create({
      run_id: task.runId,
      parent_task_id: task.parentTaskId,
      kind: task.kind,
      description: `Agent task for ${task.repo}: ${task.kind}`,
      input_params: task,
      tenant_id: task.tenantId,
    });

    // Inject dbTask.id into job data
    task.taskId = dbTask.id;

    // Use dbTask.id as the BullMQ Job ID to link them
    const job = await maestroQueue.add(task.kind, task, {
      jobId: dbTask.id,
    });

    logger.info('Task enqueued', {
      taskId: job.id,
      kind: task.kind,
      repo: task.repo,
      budgetUSD: task.budgetUSD,
    });

    return job.id!;
  }

  async enqueueTaskChain(tasks: AgentTask[]): Promise<string[]> {
    const taskIds: string[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (i > 0) {
        task.dependencies = [taskIds[i - 1]];
        task.parentTaskId = taskIds[i - 1];
      }
      const taskId = await this.enqueueTask(task);
      taskIds.push(taskId);
    }

    return taskIds;
  }

  async cancelRun(runId: string, tenantId: string): Promise<void> {
    logger.info(`Cancelling run ${runId}`);

    // 1. Update Run Status
    await runsRepo.update(runId, { status: 'cancelled' }, tenantId);

    // 2. Update all queued/running tasks to cancelled in DB
    await tasksRepo.updateStatusByRunId(runId, 'cancelled', tenantId);

    // 3. Remove jobs from BullMQ
    const tasks = await tasksRepo.listByRun(runId, tenantId);
    for (const task of tasks) {
      const job = await maestroQueue.getJob(task.id);
      if (job) {
        try {
            await job.remove();
            logger.info(`Removed job ${task.id} for cancelled run ${runId}`);
        } catch (e) {
            logger.warn(`Failed to remove job ${task.id}`, e);
        }
      }
    }
  }

  private initializeWorkers() {
    const workerOptions: WorkerOptions = {
      connection: redis,
      concurrency: 3,
      autorun: true,
      maxStalledCount: 0,
    };

    const workerTypes = ['planner', 'scaffolder', 'implementer', 'tester', 'reviewer', 'doc-writer'];

    for (const type of workerTypes) {
      const worker = new Worker<AgentTask>(
        'maestro',
        this.withGuards(this[`${type.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}Handler` as keyof MaestroOrchestrator].bind(this) as any),
        { ...workerOptions, name: type },
      );
      this.workers.set(type, worker);
    }
  }

  private withGuards<T extends AgentTask>(
    handler: (job: Job<T>) => Promise<TaskResult>,
  ) {
    return async (job: Job<T>): Promise<TaskResult> => {
      const startTime = Date.now();
      const budget = new Budget(job.data.budgetUSD);
      const taskId = job.id!;
      const tenantId = job.data.tenantId;

      try {
        // Wait for dependencies first
        if (job.data.dependencies?.length) {
          try {
             await this.checkDependencies(job.data.dependencies, tenantId);
          } catch (depError: any) {
             // If we are waiting, just re-throw to trigger backoff
             if (depError instanceof WaitingForDependenciesError) {
                 logger.info(`Task ${taskId} waiting for dependencies...`);
                 throw depError;
             }
             throw depError; // Hard failure
          }
        }

        // Mark task as running in DB only if dependencies are met
        await tasksRepo.update(taskId, { status: 'running' }, tenantId);

        // Policy guard
        const policyResult = await this.policyGuard.checkPolicy(job.data);
        if (!policyResult.allowed) {
          throw new Error(`Policy violation: ${policyResult.reason}`);
        }

        // Budget guard
        if (budget.maxUSD <= 0) {
          throw new Error('Budget exceeded: action blocked by budget guard');
        }

        logger.info('Starting agent task', {
          taskId: job.id,
          kind: job.data.kind,
          budget: budget.maxUSD,
        });

        const result = await handler(job);
        const duration = Date.now() - startTime;

        // Mark task as succeeded in DB
        await tasksRepo.update(taskId, {
          status: 'succeeded',
          output_data: result
        }, tenantId);

        return {
          ...result,
          duration,
          cost: budget.usedUSD,
        };
      } catch (error: any) {
        const duration = Date.now() - startTime;

        if (error instanceof WaitingForDependenciesError) {
             // Do NOT mark as failed in DB. Just re-throw to let BullMQ handle retry/backoff.
             // We can log it as info instead of error in the event listener.
             throw error;
        }

        logger.error('Agent task failed', {
          taskId: job.id,
          error: error.message,
          duration,
        });

        // Mark task as failed in DB
        await tasksRepo.update(taskId, {
          status: 'failed',
          error_message: error.message
        }, tenantId);

        return {
          success: false,
          duration,
          cost: budget.usedUSD,
          errors: [error.message],
        };
      }
    };
  }

  private async checkDependencies(dependencies: string[], tenantId: string): Promise<void> {
    // Use DB to check status, not Redis (which might be flushed or jobs expired)
    const tasks = await Promise.all(
        dependencies.map(id => tasksRepo.get(id, tenantId))
    );

    const anyFailed = tasks.some(
        task => task && (task.status === 'failed' || task.status === 'cancelled')
    );

    if (anyFailed) {
        throw new Error("One or more dependencies failed.");
    }

    const allSucceeded = tasks.every(
        task => task && task.status === 'succeeded'
    );

    if (!allSucceeded) {
        throw new WaitingForDependenciesError('Dependencies not yet satisfied');
    }
  }

  // Agent Handlers
  private async plannerHandler(job: Job<AgentTask>): Promise<TaskResult> {
    const { repo, issue, context } = job.data;
    logger.info('Planner agent starting', { repo, issue });
    const plan = {
      tasks: [
        { kind: 'scaffold' as const, description: 'Create boilerplate' },
        { kind: 'implement' as const, description: 'Write code' },
        { kind: 'test' as const, description: 'Add tests' },
        { kind: 'review' as const, description: 'Code review' },
        { kind: 'docs' as const, description: 'Update documentation' },
      ],
      estimate: '2 hours',
      confidence: 0.8,
    };
    return {
      success: true,
      output: plan,
      cost: 0.05,
      duration: 0,
      artifacts: [`plan-${job.id}.json`],
    };
  }

  private async scaffolderHandler(job: Job<AgentTask>): Promise<TaskResult> {
    const { repo, context } = job.data;
    logger.info('Scaffolder agent starting', { repo });
    const scaffold = {
      branch: `feature/${job.id}`,
      files_created: [
        'src/components/NewComponent.tsx',
        'src/types/NewTypes.ts',
        'tests/NewComponent.test.tsx',
      ],
    };
    return {
      success: true,
      output: scaffold,
      cost: 0.02,
      duration: 0,
      artifacts: [`scaffold-${job.id}.json`],
    };
  }

  private async implementerHandler(job: Job<AgentTask>): Promise<TaskResult> {
    const { repo, context } = job.data;
    logger.info('Implementer agent starting', { repo });
    const implementation = {
      files_modified: 3,
      lines_added: 150,
      lines_removed: 20,
      test_coverage: 85,
    };
    return {
      success: true,
      output: implementation,
      cost: 0.15,
      duration: 0,
      artifacts: [`implementation-${job.id}.diff`],
    };
  }

  private async testerHandler(job: Job<AgentTask>): Promise<TaskResult> {
    const { repo, context } = job.data;
    logger.info('Tester agent starting', { repo });
    const testResults = {
      tests_run: 25,
      tests_passed: 24,
      tests_failed: 1,
      coverage: 87,
      flakes_detected: 0,
    };
    return {
      success: testResults.tests_failed === 0,
      output: testResults,
      cost: 0.03,
      duration: 0,
      artifacts: [`test-results-${job.id}.xml`],
    };
  }

  private async reviewerHandler(job: Job<AgentTask>): Promise<TaskResult> {
    const { repo, context } = job.data;
    logger.info('Reviewer agent starting', { repo });
    const review = {
      security_issues: 0,
      code_quality_score: 8.5,
      suggestions: 3,
      approved: true,
    };
    return {
      success: true,
      output: review,
      cost: 0.08,
      duration: 0,
      artifacts: [`review-${job.id}.json`],
    };
  }

  private async docWriterHandler(job: Job<AgentTask>): Promise<TaskResult> {
    const { repo, context } = job.data;
    logger.info('Doc writer agent starting', { repo });
    const docs = {
      files_updated: ['README.md', 'CHANGELOG.md'],
      provenance_manifest: true,
      api_docs_generated: true,
    };
    return {
      success: true,
      output: docs,
      cost: 0.04,
      duration: 0,
      artifacts: [`docs-${job.id}.md`, `provenance-${job.id}.json`],
    };
  }

  private setupEventHandlers() {
    queueEvents.on('completed', async (jobId, result) => {
      logger.info('Task completed', { taskId: jobId, result });
    });

    queueEvents.on('failed', async (jobId, failedReason) => {
        // We can't easily check for WaitingForDependenciesError type here as it's serialized
        if (failedReason.message && failedReason.message.includes('Dependencies not yet satisfied')) {
            // This is expected during wait
            return;
        }
        logger.error('Task failed', { taskId: jobId, reason: failedReason });
    });

    queueEvents.on('stalled', (jobId) => {
      logger.warn('Task stalled', { taskId: jobId });
    });
  }

  async getTaskStatus(taskId: string) {
    const job = await maestroQueue.getJob(taskId);
    if (!job) return null;

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      state: await job.getState(),
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      failedReason: job.failedReason,
    };
  }

  async shutdown() {
    logger.info('Shutting down Maestro orchestrator');

    for (const [name, worker] of this.workers) {
      logger.info(`Closing worker: ${name}`);
      await worker.close();
    }

    await maestroQueue.close();
    await redis.quit();
  }
}

// Singleton instance
export const maestro = new MaestroOrchestrator();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await maestro.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await maestro.shutdown();
  process.exit(0);
});
