import AjvModule from 'ajv';
import { Queue, Worker, type JobsOptions } from 'bullmq';

const Ajv = (AjvModule as any).default || AjvModule;
import { PLAYBOOK_SCHEMA, PLAYBOOK_STEP_SCHEMA } from './schema.js';
import type {
  PlaybookDefinition,
  PlaybookRunContext,
  PlaybookRunState,
  PlaybookStep,
} from './types.js';
import { logger } from '../../utils/logger.js';

interface QueueLike {
  add: (name: string, data: any, opts?: JobsOptions) => Promise<void>;
  close?: () => Promise<void>;
}

interface WorkerLike {
  close?: () => Promise<void>;
}

interface PlaybookExecutorDeps {
  redisConnection: any;
  queueFactory?: (name: string, options: { connection: any }) => QueueLike;
  workerFactory?: (
    name: string,
    processor: (job: { data: { runKey: string; stepId: string } }) => Promise<void>,
    options: { connection: any; concurrency: number },
  ) => WorkerLike;
}

interface PlaybookRunResult {
  runId: string;
  status: 'succeeded' | 'failed';
  completedAt: string;
}

type PlaybookActionHandler = (
  step: PlaybookStep,
  context: PlaybookRunContext,
) => Promise<unknown>;

type PlaybookRunRecord = PlaybookRunState & {
  stepsById: Map<string, PlaybookStep>;
  stepStatuses: Map<string, 'pending' | 'running' | 'succeeded' | 'failed'>;
};

export class PlaybookExecutorService {
  private static instance: PlaybookExecutorService | null = null;
  private queue: QueueLike;
  private worker: WorkerLike;
  private runStore = new Map<string, PlaybookRunRecord>();
  private actionHandlers = new Map<string, PlaybookActionHandler>();
  private ajv: InstanceType<typeof Ajv>;

  private constructor(private deps: PlaybookExecutorDeps) {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    this.ajv.addSchema(PLAYBOOK_STEP_SCHEMA);
    this.ajv.addSchema(PLAYBOOK_SCHEMA);
    this.queue = deps.queueFactory
      ? deps.queueFactory('maestro_playbooks', {
          connection: deps.redisConnection,
        })
      : new Queue('maestro_playbooks', { connection: deps.redisConnection });
    this.worker = deps.workerFactory
      ? deps.workerFactory(
          'maestro_playbooks',
          async (job: any) => this.processStep(job.data),
          { connection: deps.redisConnection, concurrency: 3 },
        )
      : new Worker(
          'maestro_playbooks',
          async (job: any) => this.processStep(job.data),
          { connection: deps.redisConnection, concurrency: 3 },
        );
  }

  static getInstance(deps: PlaybookExecutorDeps) {
    if (!PlaybookExecutorService.instance) {
      PlaybookExecutorService.instance = new PlaybookExecutorService(deps);
    }
    return PlaybookExecutorService.instance;
  }

  registerActionHandler(action: string, handler: PlaybookActionHandler) {
    this.actionHandlers.set(action, handler);
  }

  validatePlaybook(playbook: PlaybookDefinition) {
    const validator = this.ajv.getSchema(
      'https://intelgraph.dev/schemas/playbook.json',
    );
    if (!validator) {
      throw new Error('Playbook schema validator not registered');
    }
    const valid = validator(playbook);
    return {
      valid: Boolean(valid),
      errors: validator.errors,
    };
  }

  async executePlaybook(
    playbook: PlaybookDefinition,
    context: PlaybookRunContext,
  ): Promise<PlaybookRunResult> {
    const validation = this.validatePlaybook(playbook);
    if (!validation.valid) {
      const message = this.ajv.errorsText(validation.errors);
      throw new Error(`Invalid playbook schema: ${message}`);
    }
    const runKey = this.getRunKey(context);
    if (this.runStore.has(runKey)) {
      return this.awaitRunCompletion(runKey);
    }

    const createdAt = new Date().toISOString();
    const stepsById = new Map(playbook.steps.map((step) => [step.id, step]));
    const stepStatuses = new Map(
      playbook.steps.map((step) => [step.id, 'pending' as const]),
    );
    this.runStore.set(runKey, {
      runId: context.runId,
      playbook,
      idempotencyKey: context.idempotencyKey,
      status: 'running',
      currentStepIndex: 0,
      createdAt,
      metadata: context.metadata,
      stepsById,
      stepStatuses,
    });

    await this.queue.add(
      'step',
      { runKey, stepId: playbook.steps[0].id },
      { jobId: `${runKey}:${playbook.steps[0].id}` },
    );

    return this.awaitRunCompletion(runKey);
  }

  async shutdown() {
    await this.worker.close?.();
    await this.queue.close?.();
  }

  private async processStep(payload: { runKey: string; stepId: string }) {
    const runRecord = this.runStore.get(payload.runKey);
    if (!runRecord) {
      throw new Error(`Playbook run not found: ${payload.runKey}`);
    }

    const step = runRecord.stepsById.get(payload.stepId);
    if (!step) {
      throw new Error(`Playbook step not found: ${payload.stepId}`);
    }

    const status = runRecord.stepStatuses.get(step.id);
    if (status === 'succeeded') {
      return;
    }

    runRecord.stepStatuses.set(step.id, 'running');

    const handler = this.actionHandlers.get(step.action);
    if (!handler) {
      runRecord.stepStatuses.set(step.id, 'failed');
      runRecord.status = 'failed';
      throw new Error(`No handler registered for action: ${step.action}`);
    }

    const context: PlaybookRunContext = {
      runId: runRecord.runId,
      playbookId: runRecord.playbook.id,
      idempotencyKey: runRecord.idempotencyKey,
      metadata: runRecord.metadata,
    };

    try {
      await handler(step, context);
      runRecord.stepStatuses.set(step.id, 'succeeded');
      const nextIndex = runRecord.currentStepIndex + 1;
      if (nextIndex >= runRecord.playbook.steps.length) {
        runRecord.status = 'succeeded';
        runRecord.completedAt = new Date().toISOString();
        return;
      }
      runRecord.currentStepIndex = nextIndex;
      const nextStep = runRecord.playbook.steps[nextIndex];
      await this.queue.add(
        'step',
        { runKey: payload.runKey, stepId: nextStep.id },
        { jobId: `${payload.runKey}:${nextStep.id}` },
      );
    } catch (error: any) {
      runRecord.stepStatuses.set(step.id, 'failed');
      runRecord.status = 'failed';
      runRecord.completedAt = new Date().toISOString();
      logger.error(`Playbook step failed: ${step.id}`);
      throw error;
    }
  }

  private getRunKey(context: PlaybookRunContext) {
    return `${context.playbookId}:${context.idempotencyKey}`;
  }

  private async awaitRunCompletion(runKey: string): Promise<PlaybookRunResult> {
    const runRecord = this.runStore.get(runKey);
    if (!runRecord) {
      throw new Error(`Playbook run not found: ${runKey}`);
    }
    if (runRecord.status !== 'running') {
      return this.getCompletedOrThrow(runKey);
    }

    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const record = this.runStore.get(runKey);
        if (!record) {
          clearInterval(interval);
          reject(new Error(`Playbook run not found: ${runKey}`));
          return;
        }
        if (record.status === 'running') return;
        clearInterval(interval);
        resolve(this.getCompletedOrThrow(runKey));
      }, 25);
    });
  }

  private getCompletedOrThrow(runKey: string): PlaybookRunResult {
    const record = this.runStore.get(runKey);
    if (!record || record.status === 'running') {
      throw new Error(`Playbook run not ready: ${runKey}`);
    }
    return {
      runId: record.runId,
      status: record.status,
      completedAt: record.completedAt ?? new Date().toISOString(),
    };
  }
}
