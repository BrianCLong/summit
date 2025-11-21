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
import { runsRepo } from '../src/maestro/runs/runs-repo.js';
import { tasksRepo } from '../src/maestro/runs/tasks-repo.js';
import { eventsRepo } from '../src/maestro/runs/events-repo.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const queueOptions: QueueOptions = {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
};

const maestroQueue = new Queue('maestro', queueOptions);
const queueEvents = new QueueEvents('maestro', { connection: redis });

export type AgentTask = {
  kind: 'plan' | 'scaffold' | 'implement' | 'test' | 'review' | 'docs';
  repo: string;
  pr?: number;
  issue: string;
  budgetUSD: number;
  context: Record<string, any>;
  parentTaskId?: string;
  dependencies?: string[];
  runId?: string;
  taskId?: string;
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

    const tenantId = task.context.tenantId || 'default';

    // Ensure Run exists
    let runId = task.runId;
    if (!runId) {
      const run = await runsRepo.create({
        pipeline_id: task.repo, // Use repo as pipeline identifier for now
        pipeline_name: `Agent Run: ${task.kind}`,
        input_params: task,
        executor_id: task.metadata.actor,
        tenant_id: tenantId,
      });
      runId = run.id;
      task.runId = runId;
    }

    // Persist Task
    const dbTask = await tasksRepo.create({
      run_id: runId,
      name: `${task.kind} task`,
      type: task.kind,
      input_params: task,
      idempotency_key: `${task.kind}-${task.repo}-${Date.now()}`, // Simple idempotency for now
      tenant_id: tenantId,
    });
    task.taskId = dbTask.id;

    const job = await maestroQueue.add(task.kind, task, {
      jobId: dbTask.id, // Use DB ID as BullMQ Job ID
    });

    logger.info('Task enqueued', {
      taskId: job.id,
      kind: task.kind,
      repo: task.repo,
      budgetUSD: task.budgetUSD,
      runId,
    });

    return job.id!;
  }

  async enqueueTaskChain(tasks: AgentTask[]): Promise<string[]> {
    const taskIds: string[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (i > 0) {
        task.dependencies = [taskIds[i - 1]];
      }
      const taskId = await this.enqueueTask(task);
      taskIds.push(taskId);
    }

    return taskIds;
  }

  private initializeWorkers() {
    const workerOptions: WorkerOptions = {
      connection: redis,
      concurrency: 3,
      autorun: true,
    };

    // Planner Agent
    const plannerWorker = new Worker<AgentTask>(
      'maestro',
      this.withGuards(this.plannerHandler.bind(this)),
      { ...workerOptions, name: 'planner' },
    );
    this.workers.set('planner', plannerWorker);

    // Scaffolder Agent
    const scaffolderWorker = new Worker<AgentTask>(
      'maestro',
      this.withGuards(this.scaffolderHandler.bind(this)),
      { ...workerOptions, name: 'scaffolder' },
    );
    this.workers.set('scaffolder', scaffolderWorker);

    // Implementer Agent
    const implementerWorker = new Worker<AgentTask>(
      'maestro',
      this.withGuards(this.implementerHandler.bind(this)),
      { ...workerOptions, name: 'implementer' },
    );
    this.workers.set('implementer', implementerWorker);

    // Tester Agent
    const testerWorker = new Worker<AgentTask>(
      'maestro',
      this.withGuards(this.testerHandler.bind(this)),
      { ...workerOptions, name: 'tester' },
    );
    this.workers.set('tester', testerWorker);

    // Reviewer Agent
    const reviewerWorker = new Worker<AgentTask>(
      'maestro',
      this.withGuards(this.reviewerHandler.bind(this)),
      { ...workerOptions, name: 'reviewer' },
    );
    this.workers.set('reviewer', reviewerWorker);

    // Doc Writer Agent
    const docWriterWorker = new Worker<AgentTask>(
      'maestro',
      this.withGuards(this.docWriterHandler.bind(this)),
      { ...workerOptions, name: 'doc-writer' },
    );
    this.workers.set('doc-writer', docWriterWorker);
  }

  private withGuards<T extends AgentTask>(
    handler: (job: Job<T>) => Promise<TaskResult>,
  ) {
    return async (job: Job<T>): Promise<TaskResult> => {
      const startTime = Date.now();
      const budget = new Budget(job.data.budgetUSD);

      const tenantId = job.data.context.tenantId || 'default';
      const taskId = job.data.taskId;

      try {
        if (taskId) {
          await tasksRepo.update(taskId, { status: 'running' }, tenantId);
        }

        // Policy guard
        const policyResult = await this.policyGuard.checkPolicy(job.data);
        if (!policyResult.allowed) {
          throw new Error(`Policy violation: ${policyResult.reason}`);
        }

        // Budget guard
        if (budget.maxUSD <= 0) {
          throw new Error('Budget exceeded: action blocked by budget guard');
        }

        // Wait for dependencies
        if (job.data.dependencies?.length) {
          await this.waitForDependencies(job.data.dependencies);
        }

        logger.info('Starting agent task', {
          taskId: job.id,
          kind: job.data.kind,
          budget: budget.maxUSD,
        });

        const result = await handler(job);
        const duration = Date.now() - startTime;

        if (taskId) {
          await tasksRepo.update(
            taskId,
            {
              status: 'completed',
              output_data: result,
            },
            tenantId,
          );

          // Record event
          if (job.data.runId) {
            await eventsRepo.create({
              run_id: job.data.runId,
              task_id: taskId,
              type: 'TASK_COMPLETED',
              payload: result,
              tenant_id: tenantId,
            });
          }
        }

        // Update task result with guardrail metadata
        return {
          ...result,
          duration,
          cost: budget.usedUSD,
        };
      } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error('Agent task failed', {
          taskId: job.id,
          error: error.message,
          duration,
        });

        if (taskId) {
          await tasksRepo.update(
            taskId,
            {
              status: 'failed',
              error_message: error.message,
            },
            tenantId,
          );

          if (job.data.runId) {
             await eventsRepo.create({
              run_id: job.data.runId,
              task_id: taskId,
              type: 'TASK_FAILED',
              payload: { error: error.message },
              tenant_id: tenantId,
            });
          }
        }

        return {
          success: false,
          duration,
          cost: budget.usedUSD,
          errors: [error.message],
        };
      }
    };
  }

  private async waitForDependencies(dependencies: string[]): Promise<void> {
    // Simple dependency waiting - in production would use more sophisticated coordination
    const maxWait = 300000; // 5 minutes
    const pollInterval = 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const jobs = await Promise.all(
        dependencies.map((id) => maestroQueue.getJob(id)),
      );

      const allComplete = jobs.every(
        (job) =>
          job &&
          (job.finishedOn !== undefined || job.failedReason !== undefined),
      );

      if (allComplete) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Dependencies not satisfied within ${maxWait}ms`);
  }

  // Agent Handlers
  private async plannerHandler(job: Job<AgentTask>): Promise<TaskResult> {
    const { repo, issue, context } = job.data;

    logger.info('Planner agent starting', { repo, issue });

    // Mock planning logic - in reality would call LLM with prompt registry
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
      cost: 0.05, // Mock LLM cost
      duration: 0, // Will be set by guard
      artifacts: [`plan-${job.id}.json`],
    };
  }

  private async scaffolderHandler(job: Job<AgentTask>): Promise<TaskResult> {
    const { repo, context } = job.data;

    logger.info('Scaffolder agent starting', { repo });

    // Mock scaffolding logic
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

    // Mock implementation logic
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

    // Mock testing logic
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

    // Mock review logic
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

    // Mock documentation logic
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
    queueEvents.on('completed', (jobId, result) => {
      logger.info('Task completed', { taskId: jobId, result });
    });

    queueEvents.on('failed', (jobId, failedReason) => {
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
