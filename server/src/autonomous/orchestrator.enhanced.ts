/**
 * Enhanced Autonomous Orchestrator - Production Implementation
 * Addresses P0 gaps: durability, idempotency, policy enforcement, observability
 */

import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';
import { Logger } from 'pino';
import { z } from 'zod';
import { CostEstimator } from './CostEstimator.js';
import { ExecutionTrace } from '../governance/execution-trace.js';

// Type definitions
export interface RunConfig {
  goal: string;
  autonomy: number; // 0-5
  mode: 'PLAN' | 'APPLY' | 'ROLLBACK';
  budgets: {
    tokens: number;
    usd: number;
    timeMinutes: number;
  };
  createdBy: string;
  tenantId: string;
  reasonForAccess?: string;
}

export interface Task {
  id: string;
  runId: string;
  type: string;
  params: Record<string, any>;
  dependencies: string[];
  safetyCategory: 'read' | 'write' | 'deploy' | 'rollback';
  requiresApproval: boolean;
  idempotencyKey: string;
}

export interface Action {
  name: string;
  version: string;
  safety: {
    category: 'read' | 'write' | 'deploy' | 'rollback';
    requiresApproval?: boolean;
    budgets: {
      timeMs: number;
      network: 'none' | 'internal' | 'internet';
    };
  };
  validate(
    input: unknown,
  ): Promise<{ success: boolean; data?: any; error?: string }>;
  plan(input: any): Promise<any>;
  apply(plan: any, ctx: ExecutionContext): Promise<any>;
  rollback?(outcome: any, ctx: ExecutionContext): Promise<void>;
}

export interface ExecutionContext {
  runId: string;
  taskId: string;
  correlationId: string;
  userId: string;
  tenantId: string;
  logger: Logger;
  tracer: any;
  killSwitch: () => boolean;
}

export interface PolicyEngine {
  evaluate(
    subject: string,
    action: string,
    resource: string,
    context: any,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    conditions?: Record<string, any>;
  }>;
}

// Validation schemas
const RunConfigSchema = z.object({
  goal: z.string().min(10).max(1000),
  autonomy: z.number().int().min(0).max(5),
  mode: z.enum(['PLAN', 'APPLY', 'ROLLBACK']),
  budgets: z.object({
    tokens: z.number().positive().max(1000000),
    usd: z.number().positive().max(1000),
    timeMinutes: z.number().positive().max(480),
  }),
  createdBy: z.string().min(1),
  tenantId: z.string().min(1),
  reasonForAccess: z.string().optional(),
});

export class EnhancedAutonomousOrchestrator {
  private db: Pool;
  private redis: Redis;
  private logger: Logger;
  private tracer: any;
  private policyEngine: PolicyEngine;
  private costEstimator: CostEstimator;
  private actions: Map<string, Action> = new Map();
  private killSwitchEnabled = false;
  private pausedRuns: Set<string> = new Set();

  constructor(
    db: Pool,
    redis: Redis,
    logger: Logger,
    policyEngine: PolicyEngine,
    costEstimator?: CostEstimator,
  ) {
    this.db = db;
    this.redis = redis;
    this.logger = logger;
    this.tracer = trace.getTracer('autonomous-orchestrator');
    this.policyEngine = policyEngine;
    this.costEstimator = costEstimator || new CostEstimator();

    // Monitor kill switch from Redis
    this.redis.subscribe('orchestrator:killswitch');
    this.redis.subscribe('orchestrator:pause');
    this.redis.subscribe('orchestrator:resume');
    this.redis.on('message', this.handleControlMessage.bind(this));
  }

  private async handleControlMessage(channel: string, message: string) {
    if (channel === 'orchestrator:killswitch') {
      this.killSwitchEnabled = message === '1';
      this.logger.warn(
        { killSwitchEnabled: this.killSwitchEnabled },
        'Kill switch toggled',
      );
    } else if (channel === 'orchestrator:pause') {
      const runId = message;
      this.pausedRuns.add(runId);
      await this.updateRunStatus(runId, 'paused');
      this.logger.warn({ runId }, 'Run paused');
    } else if (channel === 'orchestrator:resume') {
      const runId = message;
      this.pausedRuns.delete(runId);
      // We need to re-trigger execution if it was paused
      // Ideally this would emit an event or call a method to resume the loop
      // For now, we update status, and the loop checks pausedRuns
      await this.updateRunStatus(runId, 'applying');
      this.logger.info({ runId }, 'Run resumed');
    }
  }

  /**
   * Create and start a new orchestration run
   */
  async createRun(config: RunConfig): Promise<string> {
    return this.tracer.startActiveSpan(
      'orchestrator.createRun',
      async (span: Span) => {
        try {
          // Validate configuration
          const validation = RunConfigSchema.safeParse(config);
          if (!validation.success) {
            throw new Error(
              `Invalid run configuration: ${validation.error.message}`,
            );
          }

          const runId = randomUUID();
          const correlationId = randomUUID();

          // Check kill switch
          if (this.killSwitchEnabled) {
            throw new Error('Orchestration disabled by kill switch');
          }

          // Policy check for run creation
          const policyDecision = await this.policyEngine.evaluate(
            config.createdBy,
            'orchestration:create',
            config.tenantId,
            { autonomy: config.autonomy, mode: config.mode },
          );

          if (!policyDecision.allowed) {
            throw new Error(`Policy denied: ${policyDecision.reason}`);
          }

          // Create run in database
          await this.db.query(
            `
          INSERT INTO runs (
            id, goal, mode, autonomy, budget_tokens, budget_usd, budget_time_minutes,
            created_by, tenant_id, reason_for_access, config,
            approval_required
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `,
            [
              runId,
              config.goal,
              config.mode,
              config.autonomy,
              config.budgets.tokens,
              config.budgets.usd,
              config.budgets.timeMinutes,
              config.createdBy,
              config.tenantId,
              config.reasonForAccess,
              JSON.stringify(config),
              config.autonomy >= 3, // A3+ requires approval by default
            ],
          );

          // Log run creation
          await this.logEvent(
            runId,
            null,
            correlationId,
            'run_created',
            'info',
            'Orchestration run created',
            {
              autonomy: config.autonomy,
              mode: config.mode,
              budgets: config.budgets,
            },
          );

          // Start planning asynchronously
          this.startPlanning(runId, correlationId).catch((error) => {
            this.logger.error({ runId, error }, 'Planning failed');
          });

          span.setStatus({ code: SpanStatusCode.OK });
          return runId;
        } catch (error: any) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          throw error;
        }
      },
    );
  }

  /**
   * Start the planning phase
   */
  private async startPlanning(
    runId: string,
    correlationId: string,
  ): Promise<void> {
    return this.tracer.startActiveSpan('orchestration_plan', async (span: any) => {
      span.setAttributes({ runId, correlationId });

      try {
        // Update run status
        await this.updateRunStatus(runId, 'planning');

        // Get run details
        const run = await this.getRun(runId);
        if (!run) throw new Error('Run not found');

        // Generate execution plan
        const tasks = await this.generateTasks(run);

        // Store tasks with idempotency keys
        for (const task of tasks) {
          await this.createTask(task);
        }

        await this.updateRunStatus(runId, 'planned');
        await this.logEvent(
          runId,
          null,
          correlationId,
          'planning_completed',
          'info',
          `Generated ${tasks.length} tasks`,
          { taskCount: tasks.length },
        );

        // Auto-apply if autonomy level allows
        if (run.autonomy >= 3 && run.mode === 'APPLY') {
          await this.startExecution(runId, correlationId);
        }

        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error: any) {
        await this.updateRunStatus(runId, 'failed');
        await this.logEvent(
          runId,
          null,
          correlationId,
          'planning_failed',
          'error',
          'Planning failed',
          { error: error.message },
        );
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        throw error;
      }
    },
    );
  }

  /**
   * Start task execution
   */
  private async startExecution(
    runId: string,
    correlationId: string,
  ): Promise<void> {
    return this.tracer.startActiveSpan('task_execute', async (span: any) => {
      span.setAttributes({ runId, correlationId });

      try {
        await this.updateRunStatus(runId, 'applying');

        // Check if already paused
        if (this.pausedRuns.has(runId)) {
          await this.logEvent(
            runId,
            null,
            correlationId,
            'execution_paused_start',
            'warn',
            'Execution started but run is paused',
          );
          return;
        }

        // Get pending tasks
        const tasks = await this.getPendingTasks(runId);

        // Execute tasks in dependency order with parallelism
        await this.executeTasksInOrder(tasks, correlationId, runId);

        // If we finished the loop but paused, don't mark completed
        if (this.pausedRuns.has(runId)) {
           await this.logEvent(
            runId,
            null,
            correlationId,
            'execution_paused',
            'info',
            'Execution paused',
          );
          return;
        }

        // If killed
        if (this.killSwitchEnabled) { // Global kill
           // Handled in executeTasksInOrder mostly, but double check
           return;
        }

        await this.updateRunStatus(runId, 'completed');
        await this.logEvent(
          runId,
          null,
          correlationId,
          'execution_completed',
          'info',
          'All tasks completed successfully',
        );

        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error: any) {
        await this.updateRunStatus(runId, 'failed');
        await this.logEvent(
          runId,
          null,
          correlationId,
          'execution_failed',
          'error',
          'Execution failed',
          { error: error.message },
        );
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        throw error;
      }
    },
    );
  }

  /**
   * Execute a single task with idempotency and policy checks
   */
  private async executeTask(task: Task, correlationId: string): Promise<any> {
    return this.tracer.startActiveSpan(
      'orchestrator.executeTask',
      async (span: Span) => {
        span.setAttributes({
          taskId: task.id,
          taskType: task.type,
          runId: task.runId,
          correlationId,
        });

        try {
          // Check for existing execution (idempotency)
          const existing = await this.db.query(
            'SELECT * FROM tasks WHERE idempotency_key = $1 AND status = $2',
            [task.idempotencyKey, 'succeeded'],
          );

          if (existing.rows.length > 0) {
            this.logger.info(
              { taskId: task.id },
              'Task already completed, skipping',
            );
            return existing.rows[0].result;
          }

          // Check kill switch
          if (this.killSwitchEnabled) {
            throw new Error('Task cancelled by kill switch');
          }

          // Policy check
          const run = await this.getRun(task.runId);
          const policyDecision = await this.policyEngine.evaluate(
            run.created_by,
            `task:${task.type}`,
            task.runId,
            {
              safetyCategory: task.safetyCategory,
              autonomy: run.autonomy,
              params: task.params,
            },
          );

          if (!policyDecision.allowed) {
            throw new Error(
              `Policy denied task execution: ${policyDecision.reason}`,
            );
          }

          // Approval check for sensitive operations
          if (
            task.requiresApproval ||
            task.safetyCategory === 'deploy' ||
            task.safetyCategory === 'rollback'
          ) {
            const approved = await this.checkApproval(task);
            if (!approved) {
              await this.updateTaskStatus(task.id, 'pending');
              await this.logEvent(
                task.runId,
                task.id,
                correlationId,
                'task_awaiting_approval',
                'info',
                'Task requires manual approval',
              );
              return { status: 'awaiting_approval' };
            }
          }

          // Claim task for execution
          await this.updateTaskStatus(task.id, 'running');

          const action = this.actions.get(task.type);
          if (!action) {
            throw new Error(`Unknown task type: ${task.type}`);
          }

          // Validate inputs
          const validation = await action.validate(task.params);
          if (!validation.success) {
            throw new Error(`Task validation failed: ${validation.error}`);
          }

          // Create execution context
          const ctx: ExecutionContext = {
            runId: task.runId,
            taskId: task.id,
            correlationId,
            userId: run.created_by,
            tenantId: run.tenant_id,
            logger: this.logger.child({ taskId: task.id }),
            tracer: this.tracer,
            killSwitch: () => this.killSwitchEnabled,
          };

          // Initialize Execution Trace
          const traceRecorder = new ExecutionTrace({
            runId: task.runId,
            taskId: task.id,
            input: task.params,
            agentId: task.type,
          });

          try {
            // Execute plan and apply
            const plan = await action.plan(validation.data);
            await this.logEvent(
              task.runId,
              task.id,
              correlationId,
              'task_planned',
              'info',
              'Task plan generated',
              { plan },
            );

            const outcome = await action.apply(plan, ctx);

            // Record success
            await this.db.query(
              `
          UPDATE tasks 
          SET status = 'succeeded', finished_at = NOW(), result = $2
          WHERE id = $1
        `,
              [task.id, JSON.stringify(outcome)],
            );

            await this.logEvent(
              task.runId,
              task.id,
              correlationId,
              'task_completed',
              'info',
              'Task completed successfully',
              { outcome },
            );

            // Record trace artifact
            await traceRecorder.record({
              output: outcome,
              metadata: { plan, status: 'success' },
            });

            span.setStatus({ code: SpanStatusCode.OK });
            return outcome;
          } catch (execError: any) {
            // Record trace artifact for failure
            await traceRecorder.record({
              output: null,
              error: execError.message,
              metadata: { status: 'failed' },
            });
            throw execError;
          }
        } catch (error: any) {
          // Record failure
          await this.db.query(
            `
          UPDATE tasks 
          SET status = 'failed', finished_at = NOW(), error_message = $2, attempt = attempt + 1
          WHERE id = $1
        `,
            [task.id, error.message],
          );

          await this.logEvent(
            task.runId,
            task.id,
            correlationId,
            'task_failed',
            'error',
            'Task execution failed',
            { error: error.message },
          );

          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          throw error;
        }
      },
    );
  }

  /**
   * Generate tasks from run goal using AI planning
   */
  private async generateTasks(run: any): Promise<Task[]> {
    // This would use AI to break down the goal into actionable tasks
    // For now, return a simple example
    const baseTask: Task = {
      id: randomUUID(),
      runId: run.id,
      type: 'analyze_goal',
      params: { goal: run.goal },
      dependencies: [],
      safetyCategory: 'read',
      requiresApproval: false,
      idempotencyKey: this.generateIdempotencyKey('analyze_goal', {
        goal: run.goal,
      }),
    };

    const tasks = [baseTask];

    // Calculate total estimated cost
    const totalCost = this.costEstimator.estimatePlan(tasks);

    // Check against run budget
    if (run.budget_usd && totalCost.usd > run.budget_usd) {
      throw new Error(
        `Plan exceeds USD budget: $${totalCost.usd} > $${run.budget_usd}`,
      );
    }

    if (run.budget_tokens && totalCost.tokens > run.budget_tokens) {
      throw new Error(
        `Plan exceeds token budget: ${totalCost.tokens} > ${run.budget_tokens}`,
      );
    }

    this.logger.info(
      { runId: run.id, totalCost, budget: { usd: run.budget_usd, tokens: run.budget_tokens } },
      'Plan cost estimated',
    );

    return tasks;
  }

  /**
   * Execute tasks respecting dependencies and parallelism constraints
   */
  private async executeTasksInOrder(
    tasks: Task[],
    correlationId: string,
    runId: string,
  ): Promise<void> {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const completed = new Set<string>();
    const running = new Map<string, Promise<any>>();

    while (completed.size < tasks.length && !this.killSwitchEnabled && !this.pausedRuns.has(runId)) {
      // Find ready tasks (dependencies satisfied)
      const ready = tasks.filter(
        (task) =>
          !completed.has(task.id) &&
          !running.has(task.id) &&
          task.dependencies.every((dep) => completed.has(dep)),
      );

      if (ready.length === 0) {
        // Wait for running tasks to complete
        if (running.size > 0) {
          await Promise.race(running.values());
          continue;
        } else {
          // If we have remaining tasks but none are ready and none running, it's a deadlock
          if (completed.size < tasks.length) {
              throw new Error('Deadlock detected: no ready tasks and none running');
          }
          break; // Done
        }
      }

      // Start ready tasks (with parallelism limit)
      const maxParallel = 5;
      const toStart = ready.slice(0, maxParallel - running.size);

      for (const task of toStart) {
        const promise = this.executeTask(task, correlationId)
          .then((result) => {
            completed.add(task.id);
            running.delete(task.id);
            return result;
          })
          .catch((error) => {
            running.delete(task.id);
            // If task failed, we might want to stop the run or continue others?
            // For now, we let the startExecution catch block handle the first error
            throw error;
          });

        running.set(task.id, promise);
      }

      // Wait for at least one task to complete
      if (running.size > 0) {
        try {
          await Promise.race(running.values());
        } catch (e) {
          // Wait for all currently running to finish/fail if we want to bubble up,
          // or just let the loop continue and next check will catch it?
          // The current implementation re-throws immediately in the promise catch.
          throw e;
        }
      }
    }

    if (this.killSwitchEnabled) {
      throw new Error('Execution cancelled by kill switch');
    }

    if (this.pausedRuns.has(runId)) {
        // Graceful pause: waiting for running tasks to complete (already done by the while loop condition check?)
        // The while loop exits if paused. But we might have running tasks.
        // We should probably wait for them to finish before returning?
        // Or do we treat "paused" as "stop scheduling new ones"?
        // "Currently running tasks are allowed to complete (graceful pause)" - from architecture doc.
        if (running.size > 0) {
            await Promise.allSettled(running.values());
        }
    }
  }

  /**
   * Helper methods
   */
  private generateIdempotencyKey(type: string, params: any): string {
    const content = `${type}:${JSON.stringify(params, Object.keys(params).sort())}`;
    return createHash('sha256').update(content).digest('hex');
  }

  private async getRun(runId: string): Promise<any> {
    const result = await this.db.query('SELECT * FROM runs WHERE id = $1', [
      runId,
    ]);
    return result.rows[0];
  }

  private async updateRunStatus(runId: string, status: string): Promise<void> {
    await this.db.query(
      'UPDATE runs SET status = $2, started_at = COALESCE(started_at, NOW()) WHERE id = $1',
      [runId, status],
    );
  }

  private async createTask(task: Task): Promise<void> {
    await this.db.query(
      `
      INSERT INTO tasks (
        id, run_id, type, params, dependencies, safety_category, 
        requires_approval, idempotency_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [
        task.id,
        task.runId,
        task.type,
        JSON.stringify(task.params),
        task.dependencies,
        task.safetyCategory,
        task.requiresApproval,
        task.idempotencyKey,
      ],
    );
  }

  private async updateTaskStatus(
    taskId: string,
    status: string,
  ): Promise<void> {
    await this.db.query(
      'UPDATE tasks SET status = $2, started_at = COALESCE(started_at, NOW()) WHERE id = $1',
      [taskId, status],
    );
  }

  private async getPendingTasks(runId: string): Promise<Task[]> {
    const result = await this.db.query(
      'SELECT * FROM tasks WHERE run_id = $1 AND status = $2 ORDER BY created_at',
      [runId, 'pending'],
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      runId: row.run_id,
      type: row.type,
      params: row.params,
      dependencies: row.dependencies || [],
      safetyCategory: row.safety_category,
      requiresApproval: row.requires_approval,
      idempotencyKey: row.idempotency_key,
    }));
  }

  private async checkApproval(task: Task): Promise<boolean> {
    const result = await this.db.query(
      `
      SELECT status FROM approvals 
      WHERE task_id = $1 AND status = 'approved' AND expires_at > NOW()
    `,
      [task.id],
    );

    return result.rows.length > 0;
  }

  private async logEvent(
    runId: string,
    taskId: string | null,
    correlationId: string,
    eventType: string,
    level: string,
    message: string,
    payload: any = {},
  ): Promise<void> {
    await this.db.query(
      `
      INSERT INTO events (
        run_id, task_id, correlation_id, event_type, level, message, payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        runId,
        taskId,
        correlationId,
        eventType,
        level,
        message,
        JSON.stringify(payload),
      ],
    );
  }

  /**
   * Register an action for task execution
   */
  registerAction(action: Action): void {
    this.actions.set(action.name, action);
    this.logger.info(
      { actionName: action.name, version: action.version },
      'Action registered',
    );
  }

  /**
   * Emergency kill switch
   */
  async enableKillSwitch(reason: string): Promise<void> {
    await this.redis.publish('orchestrator:killswitch', '1');
    this.logger.warn({ reason }, 'Kill switch activated');
  }

  async disableKillSwitch(): Promise<void> {
    await this.redis.publish('orchestrator:killswitch', '0');
    this.logger.info('Kill switch deactivated');
  }

  /**
   * Pause/Resume controls
   */
  async pauseRun(runId: string): Promise<void> {
      await this.redis.publish('orchestrator:pause', runId);
  }

  async resumeRun(runId: string): Promise<void> {
      await this.redis.publish('orchestrator:resume', runId);
      // In a real system, we might need to wake up a worker if it stopped completely.
      // For this single-instance demo, we might need to re-call startExecution if the loop exited.
      // But since we don't have the correlationId handy here, we rely on the consumer
      // or the fact that this is a simplified orchestrator.
  }
}
