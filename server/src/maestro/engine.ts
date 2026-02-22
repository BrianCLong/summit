
import {
  MaestroTemplate, MaestroRun, MaestroTask,
  RunId, TaskId, TemplateId, TenantId
} from './model.js';
import { MaestroDSL } from './dsl.js';
import { Pool } from 'pg';
import { Queue, Worker, QueueEvents } from 'bullmq';
import { logger } from '../utils/logger.js';
import { coordinationService } from './coordination/service.js';
import * as crypto from 'node:crypto';
import {
  TransitionReceiptInput,
  emitTransitionReceipt,
} from './evidence/transition-receipts.js';
import { ForkDetector } from '@intelgraph/maestro-core';

// Interface for dependencies
interface MaestroDependencies {
  db: Pool;
  redisConnection: any; // ioredis
}

export class MaestroEngine {
  private db: Pool;
  private queue: Queue;
  private queueEvents: QueueEvents;
  private worker: Worker;
  private taskHandlers: Map<string, (task: MaestroTask) => Promise<any>> = new Map();

  constructor(private deps: MaestroDependencies) {
    this.db = deps.db;

    // Initialize BullMQ with duplicated connections to avoid sharing blocking/non-blocking state
    const connection = deps.redisConnection;
    this.queue = new Queue('maestro_v2', { connection: connection.duplicate() });
    this.queueEvents = new QueueEvents('maestro_v2', { connection: connection.duplicate() });

    // Initialize generic worker
    this.worker = new Worker('maestro_v2', async (job: any) => {
      const { taskId, runId, tenantId } = job.data;
      return this.processTask(taskId, runId, tenantId);
    }, { connection: connection.duplicate(), concurrency: 5 });

    // Setup event listeners
    this.setupEventListeners();
  }

  // --- Public API ---

  async registerTaskHandler(kind: string, handler: (task: MaestroTask) => Promise<any>) {
    this.taskHandlers.set(kind, handler);
  }

  async createRun(
    tenantId: TenantId,
    templateId: TemplateId,
    input: unknown,
    principalId: string
  ): Promise<MaestroRun> {
    // 0. Epic 2: Cost-to-Value Skew Reduction - Check for Duplicate Run
    // Check for recent identical runs to prevent redundant execution
    // Simple hash of templateId + input (assuming input is deterministic JSON)
    const inputHash = JSON.stringify(input); // Basic serialization for prototype
    // In production, use a stable hash function
    const dupRes = await this.db.query(
      `SELECT * FROM maestro_runs
       WHERE tenant_id = $1
       AND template_id = $2
       AND input = $3::jsonb
       AND status = 'succeeded'
       AND completed_at > NOW() - INTERVAL '1 hour'`,
      [tenantId, templateId, inputHash]
    );

    if (dupRes.rows.length > 0) {
      logger.info(`Returning cached run result for template ${templateId}`);
      // Return the existing run (mapped to model)
      // Note: This assumes the caller handles the 'succeeded' status correctly
      // and doesn't expect a 'pending' run they need to poll.
      // Ideally we'd return a new run pointer to the old data, but for now we return the old run.
      // We need to map the row to MaestroRun interface
      const row = dupRes.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        templateId: row.template_id,
        templateVersion: row.template_version,
        createdByPrincipalId: row.created_by_principal_id,
        status: row.status,
        input: row.input,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        metadata: row.metadata || {}
      };
    }

    // 1. Fetch Template
    const res = await this.db.query(
      `SELECT * FROM maestro_templates WHERE id = $1 AND tenant_id = $2`,
      [templateId, tenantId]
    );
    if (res.rows.length === 0) throw new Error(`Template not found: ${templateId}`);
    
    const row = res.rows[0];
    const template: MaestroTemplate = {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      version: row.version,
      description: row.description,
      kind: row.kind,
      inputSchema: row.input_schema,
      outputSchema: row.output_schema,
      spec: row.spec,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata
    };

    // 2. Validate Input (stub)
    // TODO: Validate input against template.inputSchema

    // 3. Create Run
    const runId = crypto.randomUUID();
    const run: MaestroRun = {
      id: runId,
      tenantId,
      templateId,
      templateVersion: template.version,
      createdByPrincipalId: principalId,
      status: 'pending',
      input,
      startedAt: new Date().toISOString(),
      metadata: {}
    };

    // 4. Compile Tasks
    const tasks = MaestroDSL.compileToTasks(template.spec, runId, tenantId, input);

    // 5. Transactional Persist
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Insert Run
      await client.query(
        `INSERT INTO maestro_runs (id, tenant_id, template_id, template_version, created_by_principal_id, status, input, started_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [run.id, run.tenantId, run.templateId, run.templateVersion, run.createdByPrincipalId, run.status, run.input, run.startedAt]
      );

      // Insert Tasks
      for (const t of tasks) {
        await client.query(
          `INSERT INTO maestro_tasks (id, run_id, tenant_id, name, kind, status, depends_on, attempt, max_attempts, backoff_strategy, payload, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [t.id, t.runId, t.tenantId, t.name, t.kind, t.status, t.dependsOn, t.attempt, t.maxAttempts, t.backoffStrategy, t.payload, t.metadata]
        );
      }

      await client.query('COMMIT');
    } catch (e: any) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    await this.emitReceiptSafely({
      runId,
      tenantId,
      actor: {
        id: principalId,
        principal_type: 'user',
      },
      action: 'maestro.run.create',
      resource: {
        id: runId,
        type: 'maestro.run',
        attributes: {
          templateId,
          templateVersion: template.version,
          status: run.status,
        },
      },
      result: { status: 'success' },
    });

    // 6. Enqueue Ready Tasks
    await this.dispatchReadyTasks(runId);

    return run;
  }

  // --- Internal Engine Logic ---

  private async dispatchReadyTasks(runId: string) {
    const res = await this.db.query(
      `SELECT * FROM maestro_tasks WHERE run_id = $1 AND status = 'ready'`,
      [runId]
    );

    // Map snake_case db rows to MaestroTask manually or via helper
    // For now assuming we handle this.

    for (const row of res.rows) {
      const taskForEntropy = {
        name: row.name,
        kind: row.kind,
        payload: row.payload,
        config: row.metadata,
      };
      const entropy = ForkDetector.calculateEntropy(taskForEntropy);
      const priority = 1 + Math.floor((1 - entropy) * 100);

      await this.queue.add(row.kind, {
        taskId: row.id,
        runId: row.run_id,
        tenantId: row.tenant_id
      }, {
        priority
      });

      await this.db.query(
        `UPDATE maestro_tasks SET status = 'queued' WHERE id = $1`,
        [row.id]
      );

      await this.emitReceiptSafely({
        runId: row.run_id,
        tenantId: row.tenant_id,
        actor: { id: 'maestro-engine', principal_type: 'system' },
        action: 'maestro.task.queued',
        resource: {
          id: row.id,
          type: 'maestro.task',
          attributes: {
            kind: row.kind,
            status: 'queued',
            fork_score: entropy,
            priority,
          },
        },
        result: { status: 'success' },
      });
    }
  }

  private async processTask(taskId: string, runId: string, tenantId: string): Promise<any> {
    // 1. Fetch Task
    const res = await this.db.query(`SELECT * FROM maestro_tasks WHERE id = $1`, [taskId]);
    if (res.rows.length === 0) throw new Error(`Task not found: ${taskId}`);
    const taskRow = res.rows[0];

    const task: MaestroTask = {
      ...taskRow,
      dependsOn: taskRow.depends_on,
      maxAttempts: taskRow.max_attempts,
      backoffStrategy: taskRow.backoff_strategy
    };

    // 2. Mark Running
    await this.db.query(
      `UPDATE maestro_tasks SET status = 'running', started_at = NOW(), attempt = attempt + 1 WHERE id = $1`,
      [taskId]
    );

    await this.emitReceiptSafely({
      runId,
      tenantId,
      actor: { id: 'maestro-engine', principal_type: 'system' },
      action: 'maestro.task.started',
      resource: {
        id: taskId,
        type: 'maestro.task',
        attributes: {
          kind: task.kind,
          status: 'running',
        },
      },
      result: { status: 'success' },
    });

    try {
      // 2.5 Check Coordination Constraints (Budget, Kill-Switch)
      if (task.metadata?.coordinationId) {
        const coordId = task.metadata.coordinationId as string;
        // Assume task has a 'role' in metadata, or default to WORKER
        const role = (task.metadata.role as any) || 'WORKER';
        // We use the run's creator or a specific agentId if present
        const agentId = (task.metadata.agentId as string) || 'unknown_agent';

        // Check if allowed to proceed
        const allowed = coordinationService.validateAction(coordId, agentId, role);
        if (!allowed) {
          throw new Error(`Coordination constraints prevented execution for ${coordId}`);
        }

        // Track start (could consume a 'step' budget here)
        coordinationService.consumeBudget(coordId, { totalSteps: 1 });
      }

      // 3. Execute Handler
      const handler = this.taskHandlers.get(task.kind);
      if (!handler) {
        throw new Error(`No handler registered for task kind: ${task.kind}`);
      }

      const result = await handler(task);

      // 3.5 Consumne Token Budget if available
      if (task.metadata?.coordinationId && result && typeof result === 'object' && result.usage?.totalTokens) {
        const coordId = task.metadata.coordinationId as string;
        coordinationService.consumeBudget(coordId, { totalTokens: result.usage.totalTokens });
      }

      // 4. Mark Succeeded
      await this.db.query(
        `UPDATE maestro_tasks SET status = 'succeeded', result = $2, completed_at = NOW() WHERE id = $1`,
        [taskId, result]
      );

      await this.emitReceiptSafely({
        runId,
        tenantId,
        actor: { id: 'maestro-engine', principal_type: 'system' },
        action: 'maestro.task.succeeded',
        resource: {
          id: taskId,
          type: 'maestro.task',
          attributes: {
            kind: task.kind,
            status: 'succeeded',
          },
        },
        result: { status: 'success' },
      });

      // 5. Trigger Dependents
      await this.evaluateDependents(taskId, runId);

    } catch (err: any) {
      // 6. Handle Failure
      // TODO: Retry logic based on backoffStrategy
      await this.db.query(
        `UPDATE maestro_tasks SET status = 'failed', error = $2, completed_at = NOW() WHERE id = $1`,
        [taskId, err.message]
      );

      await this.emitReceiptSafely({
        runId,
        tenantId,
        actor: { id: 'maestro-engine', principal_type: 'system' },
        action: 'maestro.task.failed',
        resource: {
          id: taskId,
          type: 'maestro.task',
          attributes: {
            kind: task.kind,
            status: 'failed',
          },
        },
        result: { status: 'failure', details: err.message },
      });

      // Fail run if critical?
      // For now just mark task failed.
      throw err;
    }
  }

  private async evaluateDependents(completedTaskId: string, runId: string) {
    // Find tasks that depend on this one
    // In a real implementation we might optimize this query
    const res = await this.db.query(
      `SELECT * FROM maestro_tasks WHERE run_id = $1 AND $2 = ANY(depends_on) AND status = 'pending'`,
      [runId, completedTaskId]
    );

    for (const dependentRow of res.rows) {
      // Check if ALL dependencies are satisfied
      const deps = dependentRow.depends_on as string[];
      const satisfied = await this.areDependenciesSatisfied(deps);

      if (satisfied) {
        // Mark Ready
        await this.db.query(
          `UPDATE maestro_tasks SET status = 'ready' WHERE id = $1`,
          [dependentRow.id]
        );

        // Dispatch
        const taskForEntropy = {
          name: dependentRow.name,
          kind: dependentRow.kind,
          payload: dependentRow.payload,
          config: dependentRow.metadata,
        };
        const entropy = ForkDetector.calculateEntropy(taskForEntropy);
        const priority = 1 + Math.floor((1 - entropy) * 100);

        await this.queue.add(dependentRow.kind, {
          taskId: dependentRow.id,
          runId: dependentRow.run_id,
          tenantId: dependentRow.tenant_id
        }, {
          priority
        });

        await this.db.query(
          `UPDATE maestro_tasks SET status = 'queued' WHERE id = $1`,
          [dependentRow.id]
        );
      }
    }

    // Check if Run is complete
    await this.checkRunCompletion(runId);
  }

  private async areDependenciesSatisfied(taskIds: string[]): Promise<boolean> {
    if (taskIds.length === 0) return true;

    const res = await this.db.query(
      `SELECT count(*) as count FROM maestro_tasks WHERE id = ANY($1) AND status = 'succeeded'`,
      [taskIds]
    );
    return parseInt(res.rows[0].count) === taskIds.length;
  }

  private async checkRunCompletion(runId: string) {
    // Check if any tasks are not succeeded/failed/skipped/cancelled
    const res = await this.db.query(
      `SELECT count(*) as count FROM maestro_tasks WHERE run_id = $1 AND status NOT IN ('succeeded', 'failed', 'skipped', 'cancelled')`,
      [runId]
    );

    if (parseInt(res.rows[0].count) === 0) {
      // All tasks terminal. Check for failures.
      const failRes = await this.db.query(
        `SELECT count(*) as count FROM maestro_tasks WHERE run_id = $1 AND status = 'failed'`,
        [runId]
      );

      const finalStatus = parseInt(failRes.rows[0].count) > 0 ? 'failed' : 'succeeded';

      await this.db.query(
        `UPDATE maestro_runs SET status = $2, completed_at = NOW() WHERE id = $1`,
        [runId, finalStatus]
      );

      const tenantRes = await this.db.query(
        `SELECT tenant_id FROM maestro_runs WHERE id = $1`,
        [runId],
      );

      await this.emitReceiptSafely({
        runId,
        tenantId: tenantRes.rows?.[0]?.tenant_id || 'unknown',
        actor: { id: 'maestro-engine', principal_type: 'system' },
        action: 'maestro.run.completed',
        resource: {
          id: runId,
          type: 'maestro.run',
          attributes: {
            status: finalStatus,
          },
        },
        result: { status: finalStatus === 'failed' ? 'failure' : 'success' },
      });

      logger.info(`Run ${runId} completed with status ${finalStatus}`);
    }
  }

  private setupEventListeners() {
    this.queueEvents.on('completed', ({ jobId }: any) => {
      logger.debug(`Job ${jobId} completed`);
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }: any) => {
      logger.error(`Job ${jobId} failed: ${failedReason}`);
    });
  }

  private async emitReceiptSafely(input: TransitionReceiptInput) {
    try {
      await emitTransitionReceipt(input);
    } catch (error: any) {
      logger.error('Governed Exception: receipt emission failed', {
        action: input.action,
        runId: input.runId,
        resourceId: input.resource.id,
        error: error.message,
      });
    }
  }

  async shutdown() {
    await this.worker.close();
    await this.queue.close();
    await this.queueEvents.close();
  }
}
