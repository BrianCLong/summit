// @ts-nocheck
import {
  Queue,
  Worker,
  QueueEvents,
  Job,
  QueueOptions,
  WorkerOptions,
} from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';
import { AgentTask, TaskResult } from './types.js';
import { PolicyGuard } from './policyGuard.js';
import { systemMonitor } from '../lib/system-monitor.js';
import { getTracer, SpanStatusCode, SpanKind } from '../observability/tracer.js';

// Mock Budget class until we locate the real one or fix the import
class Budget {
    maxUSD: number;
    usedUSD: number;
    constructor(maxUSD: number) {
        this.maxUSD = maxUSD;
        this.usedUSD = 0;
    }
}

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

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


class MaestroOrchestrator {
  private policyGuard: PolicyGuard;
  private workers: Map<string, Worker> = new Map();

  constructor() {
    this.policyGuard = new PolicyGuard();
    this.initializeWorkers();
    this.setupEventHandlers();
  }

  async enqueueTask(task: AgentTask): Promise<string> {
    const tracer = getTracer();
    return tracer.withSpan('maestro.enqueueTask', async (span: any) => {
      span.setAttribute('maestro.task.kind', task.kind);
      span.setAttribute('maestro.task.repo', task.repo);
      span.setAttribute('maestro.task.budget', task.budgetUSD);

      // 1. System Health Check (Backpressure)
      const health = systemMonitor.getHealth();
      if (health.isOverloaded) {
        throw new Error(`System overloaded: ${health.reason}. Task rejected.`);
      }

      // 2. Queue Depth Check (Backpressure)
      const waitingCount = await maestroQueue.count();
      const MAX_QUEUE_DEPTH = 1000; // Hard limit for backlog
      if (waitingCount > MAX_QUEUE_DEPTH) {
        throw new Error(`Queue full (${waitingCount} pending). Task rejected.`);
      }

      try {
        // Pre-flight policy check
        const policyResult = await this.policyGuard.checkPolicy(task);
        if (!policyResult.allowed) {
          throw new Error(`Task blocked by policy: ${policyResult.reason}`);
        }

        const job = await maestroQueue.add(task.kind, task, {
          jobId: `${task.kind}-${task.repo}-${Date.now()}`,
        });

        span.setAttribute('maestro.job.id', job.id || 'unknown');

        logger.info('Task enqueued', {
          taskId: job.id,
          kind: task.kind,
          repo: task.repo,
          budgetUSD: task.budgetUSD,
        });

        return job.id!;
      } catch (error: any) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        throw error;
      }
    }, { kind: SpanKind.PRODUCER });
  }

  async enqueueTaskChain(tasks: AgentTask[]): Promise<string[]> {
    const tracer = getTracer();
    return tracer.withSpan('maestro.enqueueTaskChain', async (span: any) => {
      span.setAttribute('maestro.chain.length', tasks.length);
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
    });
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
      this.withGuards(this.plannerHandler.bind(this), 'planner'),
      { ...workerOptions, name: 'planner' },
    );
    this.workers.set('planner', plannerWorker);

    // Scaffolder Agent
    const scaffolderWorker = new Worker<AgentTask>(
      'maestro',
      this.withGuards(this.scaffolderHandler.bind(this), 'scaffolder'),
      { ...workerOptions, name: 'scaffolder' },
    );
    this.workers.set('scaffolder', scaffolderWorker);

    // Implementer Agent
    const implementerWorker = new Worker<AgentTask>(
      'maestro',
      this.withGuards(this.implementerHandler.bind(this), 'implementer'),
      { ...workerOptions, name: 'implementer' },
    );
    this.workers.set('implementer', implementerWorker);

    // Tester Agent
    const testerWorker = new Worker<AgentTask>(
      'maestro',
      this.withGuards(this.testerHandler.bind(this), 'tester'),
      { ...workerOptions, name: 'tester' },
    );
    this.workers.set('tester', testerWorker);

    // Reviewer Agent
    const reviewerWorker = new Worker<AgentTask>(
      'maestro',
      this.withGuards(this.reviewerHandler.bind(this), 'reviewer'),
      { ...workerOptions, name: 'reviewer' },
    );
    this.workers.set('reviewer', reviewerWorker);

    // Doc Writer Agent
    const docWriterWorker = new Worker<AgentTask>(
      'maestro',
      this.withGuards(this.docWriterHandler.bind(this), 'doc-writer'),
      { ...workerOptions, name: 'doc-writer' },
    );
    this.workers.set('doc-writer', docWriterWorker);
  }

  private withGuards<T extends AgentTask>(
    handler: (job: Job<T>) => Promise<TaskResult>,
    agentName: string
  ) {
    return async (job: Job<T>): Promise<TaskResult> => {
      const tracer = getTracer();
      return tracer.withSpan(`maestro.agent.${agentName}`, async (span: any) => {
        span.setAttribute('maestro.agent.name', agentName);
        span.setAttribute('maestro.job.id', job.id || 'unknown');
        span.setAttribute('maestro.task.kind', job.data.kind);
        span.setAttribute('maestro.task.repo', job.data.repo);

        const startTime = Date.now();
        const budget = new Budget(job.data.budgetUSD);

        try {
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

          // Update task result with guardrail metadata
          return {
            ...result,
            duration,
            cost: budget.usedUSD,
          };
        } catch (error: any) {
          const duration = Date.now() - startTime;
          const errorMessage = error.message;

          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: errorMessage,
          });

          logger.error('Agent task failed', {
            taskId: job.id,
            error: errorMessage,
            duration,
          });

          return {
            success: false,
            duration,
            cost: budget.usedUSD,
            errors: [errorMessage],
          };
        }
      }, { kind: SpanKind.CONSUMER });
    };
  }

  private async waitForDependencies(dependencies: string[]): Promise<void> {
    const tracer = getTracer();
    return tracer.withSpan('maestro.waitForDependencies', async (span: any) => {
      span.setAttribute('maestro.dependencies.count', dependencies.length);

      // Simple dependency waiting - in production would use more sophisticated coordination
      const maxWait = 300000; // 5 minutes
      const pollInterval = 5000; // 5 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < maxWait) {
        const jobs = await Promise.all(
          dependencies.map((id) => maestroQueue.getJob(id)),
        );

        const allComplete = jobs.every(
          (job: any) =>
            job &&
            (job.finishedOn !== undefined || job.failedReason !== undefined),
        );

        if (allComplete) {
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }

      throw new Error(`Dependencies not satisfied within ${maxWait}ms`);
    });
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
        'src/components/NewComponent.js',
        'src/types/NewTypes.js',
        'tests/NewComponent.test.js',
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
