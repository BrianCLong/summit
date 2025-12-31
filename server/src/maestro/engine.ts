
import {
  MaestroTemplate, MaestroRun, MaestroTask,
  RunId, TaskId, TemplateId, TenantId
} from './model';
import { MaestroDSL } from './dsl';
import { Pool } from 'pg';
import { Queue, Worker, QueueEvents } from 'bullmq';
import { logger } from '../utils/logger';
import { coordinationService } from './coordination/service';
import * as crypto from 'node:crypto';
import { policyEngine, AgentContext } from './governance/policy';
import { provenanceRecorder } from './governance/provenance';
import { MaestroAgent } from './model';

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

    // Initialize Provenance Persistence
    provenanceRecorder.init(deps.db);

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

    // 3.5 Initialize Provenance if Agent Run
    if (run.metadata?.agentId || template.kind === 'agent') {
       // Best effort initialization
       const agentId = (run.metadata?.agentId as string) || templateId; // Fallback
       await provenanceRecorder.startTrace(runId, agentId, tenantId, templateId);
    }

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

    // Fetch Run for Context
    const runRes = await this.db.query(`SELECT * FROM maestro_runs WHERE id = $1`, [runId]);
    const runRow = runRes.rows[0];

    // 2. Mark Running
    await this.db.query(
      `UPDATE maestro_tasks SET status = 'running', started_at = NOW(), attempt = attempt + 1 WHERE id = $1`,
      [taskId]
    );

    try {
      // 2.5 Governance: Policy Check & Hard Caps
      const agentId = (task.metadata?.agentId as string) || (runRow.metadata?.agentId as string);

      if (agentId) {
        const agent = await this.getAgent(agentId, tenantId);
        if (agent) {
          const usage = await this.getRunUsage(runId);
          const context: AgentContext = {
            tenantId,
            agentId,
            capabilities: agent.capabilities || [],
            currentUsage: {
              actions: usage.actions,
              tokens: usage.tokens,
              externalCalls: usage.externalCalls,
              cost: usage.cost,
              startTime: new Date(runRow.started_at).getTime()
            }
          };

          // Map task kind to action for policy check
          let action = task.kind;
          if (task.kind === 'http_request') {
             const method = (task.payload as any)?.method?.toLowerCase() || 'get';
             action = `http.${method}`;
          } else if (task.kind === 'script') {
             action = 'script.exec';
          }

          const decision = await policyEngine.evaluateAction(context, {
            action,
            params: task.payload,
            resource: (task.payload as any)?.url // Extract URL for HTTP requests
          });

          if (!decision.allowed) {
            throw new Error(`Policy Violation: ${decision.reason} (${decision.violation})`);
          }
        }
      }

      // 2.6 Check Coordination Constraints (Budget, Kill-Switch)
      if (task.metadata?.coordinationId) {
        const coordId = task.metadata.coordinationId as string;
        // Assume task has a 'role' in metadata, or default to WORKER
        const role = (task.metadata.role as any) || 'WORKER';
        // We use the run's creator or a specific agentId if present
        const agentIdRef = (task.metadata.agentId as string) || 'unknown_agent';

        // Check if allowed to proceed
        const allowed = coordinationService.validateAction(coordId, agentIdRef, role);
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

      const startTime = Date.now();
      const result = await handler(task);
      const duration = Date.now() - startTime;

      // 3.5 Consumne Token Budget if available
      let tokensUsed = 0;
      if (result && typeof result === 'object' && result.usage?.totalTokens) {
        tokensUsed = result.usage.totalTokens;
      }

      if (task.metadata?.coordinationId && tokensUsed > 0) {
        const coordId = task.metadata.coordinationId as string;
        coordinationService.consumeBudget(coordId, { totalTokens: tokensUsed });
      }

      // 3.5.5 Update Usage Metrics
      const externalCall = (task.kind === 'http_request' || task.kind === 'graph_job') ? 1 : 0;
      await this.db.query(`
        UPDATE maestro_runs
        SET usage_metrics = jsonb_set(
            jsonb_set(
                jsonb_set(
                    COALESCE(usage_metrics, '{}'::jsonb),
                    '{total_actions}',
                    (COALESCE(usage_metrics->>'total_actions','0')::int + 1)::text::jsonb
                ),
                '{total_tokens}',
                (COALESCE(usage_metrics->>'total_tokens','0')::int + $1)::text::jsonb
            ),
            '{total_external_calls}',
            (COALESCE(usage_metrics->>'total_external_calls','0')::int + $2)::text::jsonb
        )
        WHERE id = $3
      `, [tokensUsed, externalCall, runId]);


      // 3.6 Record Provenance
      if (agentId) {
        // Await logic to ensure order/durability
        await provenanceRecorder.recordStep(runId, {
            stepId: Date.now(), // Provisional ID
            timestamp: new Date().toISOString(),
            action: task.kind,
            input: task.payload,
            policyDecision: { allowed: true, reason: 'Policy check passed' },
            output: result,
            usage: {
                tokens: tokensUsed,
                durationMs: duration
            }
        });
      }

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

      // Finalize Provenance Trace
      await provenanceRecorder.finalizeTrace(runId, finalStatus as any);

      logger.info(`Run ${runId} completed with status ${finalStatus}`);
    }
  }

  private async getAgent(agentId: string, tenantId: string): Promise<MaestroAgent | null> {
      const res = await this.db.query(
          `SELECT * FROM maestro_agents WHERE id = $1 AND tenant_id = $2`,
          [agentId, tenantId]
      );
      if (res.rows.length === 0) return null;
      return res.rows[0];
  }

  private async getRunUsage(runId: string): Promise<{ actions: number; tokens: number; externalCalls: number; cost: number }> {
      // Use cached metrics if available (preferred)
      const res = await this.db.query(
          `SELECT usage_metrics FROM maestro_runs WHERE id = $1`,
          [runId]
      );

      const metrics = res.rows[0]?.usage_metrics;
      if (metrics) {
          return {
              actions: parseInt(metrics.total_actions || '0'),
              tokens: parseInt(metrics.total_tokens || '0'),
              externalCalls: parseInt(metrics.total_external_calls || '0'),
              cost: parseFloat(metrics.total_cost_usd || '0.0')
          };
      }

      // Fallback (e.g. legacy runs or race condition where metrics are null)
      return { actions: 0, tokens: 0, externalCalls: 0, cost: 0 };
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
