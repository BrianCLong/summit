
import {
  MaestroTemplate, MaestroRun, MaestroTask,
  RunId, TaskId, TemplateId, TenantId
} from './model';
import { MaestroDSL } from './dsl';
import { Pool } from 'pg';
import { Queue, Worker, QueueEvents } from 'bullmq';
import { logger } from '../utils/logger';

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

    // Initialize BullMQ
    this.queue = new Queue('maestro_v2', { connection: deps.redisConnection });
    this.queueEvents = new QueueEvents('maestro_v2', { connection: deps.redisConnection });

    // Initialize generic worker
    this.worker = new Worker('maestro_v2', async (job) => {
      const { taskId, runId, tenantId } = job.data;
      return this.processTask(taskId, runId, tenantId);
    }, { connection: deps.redisConnection, concurrency: 5 });

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
    // 1. Fetch Template
    const res = await this.db.query(
      `SELECT * FROM maestro_templates WHERE id = $1 AND tenant_id = $2`,
      [templateId, tenantId]
    );
    if (res.rows.length === 0) throw new Error(`Template not found: ${templateId}`);
    const template: MaestroTemplate = res.rows[0]; // TODO: Map snake_case to camelCase

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
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

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
      await this.queue.add(row.kind, {
        taskId: row.id,
        runId: row.run_id,
        tenantId: row.tenant_id
      });

      await this.db.query(
        `UPDATE maestro_tasks SET status = 'queued' WHERE id = $1`,
        [row.id]
      );
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

    try {
      // 3. Execute Handler
      const handler = this.taskHandlers.get(task.kind);
      if (!handler) {
        throw new Error(`No handler registered for task kind: ${task.kind}`);
      }

      const result = await handler(task);

      // 4. Mark Succeeded
      await this.db.query(
        `UPDATE maestro_tasks SET status = 'succeeded', result = $2, completed_at = NOW() WHERE id = $1`,
        [taskId, result]
      );

      // 5. Trigger Dependents
      await this.evaluateDependents(taskId, runId);

    } catch (err: any) {
      // 6. Handle Failure
      // TODO: Retry logic based on backoffStrategy
      await this.db.query(
        `UPDATE maestro_tasks SET status = 'failed', error = $2, completed_at = NOW() WHERE id = $1`,
        [taskId, err.message]
      );

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
        await this.queue.add(dependentRow.kind, {
          taskId: dependentRow.id,
          runId: dependentRow.run_id,
          tenantId: dependentRow.tenant_id
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

      logger.info(`Run ${runId} completed with status ${finalStatus}`);
    }
  }

  private setupEventListeners() {
    this.queueEvents.on('completed', ({ jobId }) => {
      logger.debug(`Job ${jobId} completed`);
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error(`Job ${jobId} failed: ${failedReason}`);
    });
  }

  async shutdown() {
    await this.worker.close();
    await this.queue.close();
    await this.queueEvents.close();
  }
}
