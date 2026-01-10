import { getPostgresPool } from '../db/postgres.js';
import type {
  Convoy,
  DurableEvent,
  Formula,
  Hook,
  Molecule,
  MoleculeStep,
  WorkTask,
} from './types';
import { compileFormula } from './formula';
import { resolveNextStep } from './logic';
import { makeDeterministicId, makeEphemeralId } from './ids';
import { PolicyEngine } from '../governance/PolicyEngine.js';
import type { PolicyContext } from '../governance/types.js';

const pool = getPostgresPool();
const policyEngine = new PolicyEngine();

export interface CreateConvoyInput {
  name: string;
  description?: string;
  targetCompletion?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateTaskInput {
  convoyId?: string;
  formulaId?: string;
  moleculeId?: string;
  stepId?: string;
  idempotencyKey?: string;
  dependencies?: string[];
  acceptanceCriteria?: string[];
  maxAttempts?: number;
  dueAt?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateFormulaInput {
  name: string;
  version: string;
  description?: string;
  template: Formula['template'];
  metadata?: Record<string, unknown>;
}

export class WorkOrchestrationService {
  async createConvoy(
    tenantId: string,
    createdBy: string,
    input: CreateConvoyInput,
  ): Promise<Convoy> {
    await this.enforcePolicy({
      stage: 'runtime',
      tenantId,
      payload: { action: 'createConvoy', convoyName: input.name },
    });
    const id = makeDeterministicId(`${tenantId}:convoy:${input.name}`);

    const result = await pool.write(
      `INSERT INTO durable_work_convoys (
        id, tenant_id, name, description, target_completion, created_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        id,
        tenantId,
        input.name,
        input.description || null,
        input.targetCompletion || null,
        createdBy,
        JSON.stringify(input.metadata || {}),
      ],
    );

    await this.recordEvent({
      tenantId,
      entityType: 'convoy',
      entityId: id,
      eventType: 'convoy:create',
      payload: { name: input.name },
      actorAgentId: createdBy,
    });

    return this.toConvoy(result.rows[0]);
  }

  async createTask(
    tenantId: string,
    createdBy: string,
    input: CreateTaskInput,
  ): Promise<WorkTask> {
    await this.enforcePolicy({
      stage: 'runtime',
      tenantId,
      payload: { action: 'createTask', convoyId: input.convoyId },
    });
    const idempotencyKey = input.idempotencyKey;
    const seed = idempotencyKey
      ? `${tenantId}:task:${idempotencyKey}`
      : makeEphemeralId();
    const id = makeDeterministicId(seed);

    const result = await pool.write(
      `INSERT INTO durable_work_tasks (
        id, tenant_id, convoy_id, formula_id, molecule_id, step_id, idempotency_key,
        dependencies, max_attempts, acceptance_criteria, created_by, due_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        id,
        tenantId,
        input.convoyId || null,
        input.formulaId || null,
        input.moleculeId || null,
        input.stepId || null,
        idempotencyKey || null,
        input.dependencies || [],
        input.maxAttempts || 3,
        input.acceptanceCriteria || [],
        createdBy,
        input.dueAt || null,
        JSON.stringify(input.metadata || {}),
      ],
    );

    await this.recordEvent({
      tenantId,
      entityType: 'task',
      entityId: id,
      eventType: 'task:create',
      payload: { convoyId: input.convoyId },
      actorAgentId: createdBy,
    });

    return this.toTask(result.rows[0]);
  }

  async addDependencies(
    tenantId: string,
    taskId: string,
    dependencyIds: string[],
  ): Promise<WorkTask | null> {
    const result = await pool.write(
      `UPDATE durable_work_tasks
       SET dependencies = (
         SELECT ARRAY(
           SELECT DISTINCT unnest(coalesce(dependencies, '{}') || $2::uuid[])
         )
       ),
       updated_at = NOW()
       WHERE id = $1 AND tenant_id = $3
       RETURNING *`,
      [taskId, dependencyIds, tenantId],
    );

    if (!result.rows[0]) {
      return null;
    }

    await this.recordEvent({
      tenantId,
      entityType: 'task',
      entityId: taskId,
      eventType: 'task:add-dependencies',
      payload: { dependencies: dependencyIds },
    });

    return this.toTask(result.rows[0]);
  }

  async createFormula(
    tenantId: string,
    createdBy: string,
    input: CreateFormulaInput,
  ): Promise<Formula> {
    await this.enforcePolicy({
      stage: 'runtime',
      tenantId,
      payload: { action: 'createFormula', formulaName: input.name },
    });
    const id = makeDeterministicId(
      `${tenantId}:formula:${input.name}:${input.version}`,
    );

    const result = await pool.write(
      `INSERT INTO durable_work_formulas (
        id, tenant_id, name, version, description, template, created_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        id,
        tenantId,
        input.name,
        input.version,
        input.description || null,
        JSON.stringify(input.template),
        createdBy,
        JSON.stringify(input.metadata || {}),
      ],
    );

    await this.recordEvent({
      tenantId,
      entityType: 'formula',
      entityId: id,
      eventType: 'formula:create',
      payload: { name: input.name, version: input.version },
      actorAgentId: createdBy,
    });

    return this.toFormula(result.rows[0]);
  }

  async getFormula(tenantId: string, formulaId: string): Promise<Formula | null> {
    const result = await pool.read(
      `SELECT * FROM durable_work_formulas WHERE tenant_id = $1 AND id = $2`,
      [tenantId, formulaId],
    );

    const row = result.rows[0];
    return row ? this.toFormula(row) : null;
  }

  async compileFormulaToMolecule(
    tenantId: string,
    createdBy: string,
    formula: Formula,
    convoyId: string,
  ): Promise<Molecule> {
    await this.enforcePolicy({
      stage: 'runtime',
      tenantId,
      payload: { action: 'compileFormula', formulaId: formula.id, convoyId },
    });
    const compiled = compileFormula(formula.template, {
      tenantId,
      convoyId,
      formulaId: formula.id,
      createdBy,
    });

    return pool.withTransaction(async (client) => {
      const molecule = await client.query(
        `INSERT INTO durable_work_molecules (
          id, tenant_id, formula_id, convoy_id, step_ids, cursor, inputs, outputs
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          compiled.moleculeId,
          tenantId,
          formula.id,
          convoyId,
          compiled.stepIds,
          compiled.stepIds[0] || null,
          {},
          {},
        ],
      );

      for (const step of compiled.steps) {
        await client.query(
          `INSERT INTO durable_work_steps (
            id, tenant_id, molecule_id, name, status, depends_on,
            acceptance_criteria, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            step.id,
            tenantId,
            compiled.moleculeId,
            step.name,
            step.status,
            step.dependsOn,
            step.acceptanceCriteria,
            JSON.stringify(step.metadata || {}),
          ],
        );
      }

      await this.recordEvent({
        tenantId,
        entityType: 'molecule',
        entityId: compiled.moleculeId,
        eventType: 'molecule:compile',
        payload: { formulaId: formula.id, convoyId },
        actorAgentId: createdBy,
      });

      return this.toMolecule(molecule.rows[0]);
    });
  }

  async getNextStep(
    tenantId: string,
    moleculeId: string,
  ): Promise<MoleculeStep | null> {
    const result = await pool.read(
      `SELECT * FROM durable_work_steps WHERE tenant_id = $1 AND molecule_id = $2`,
      [tenantId, moleculeId],
    );

    const steps = (result.rows || []).map(this.toStep);
    return resolveNextStep(steps);
  }

  async closeStep(
    tenantId: string,
    moleculeId: string,
    stepId: string,
  ): Promise<MoleculeStep | null> {
    return pool.withTransaction(async (client) => {
      const stepResult = await client.query(
        `UPDATE durable_work_steps
         SET status = 'completed', updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2 AND molecule_id = $3
         RETURNING *`,
        [stepId, tenantId, moleculeId],
      );

      if (!stepResult.rows[0]) {
        return null;
      }

      const steps = await client.query(
        `SELECT * FROM durable_work_steps WHERE tenant_id = $1 AND molecule_id = $2`,
        [tenantId, moleculeId],
      );

      const allCompleted = steps.rows.every(
        (step: any) => step.status === 'completed',
      );

      await client.query(
        `UPDATE durable_work_molecules
         SET status = $1, cursor = $2, updated_at = NOW()
         WHERE id = $3 AND tenant_id = $4`,
        [
          allCompleted ? 'completed' : 'running',
          stepId,
          moleculeId,
          tenantId,
        ],
      );

      await this.recordEvent({
        tenantId,
        entityType: 'step',
        entityId: stepId,
        eventType: 'step:completed',
        payload: { moleculeId },
      });

      return this.toStep(stepResult.rows[0]);
    });
  }

  async createHook(
    tenantId: string,
    agentId: string,
  ): Promise<Hook> {
    const id = makeDeterministicId(`${tenantId}:hook:${agentId}`);
    const result = await pool.write(
      `INSERT INTO durable_work_hooks (id, tenant_id, agent_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [id, tenantId, agentId],
    );

    return this.toHook(result.rows[0]);
  }

  async assignTaskToHook(
    tenantId: string,
    taskId: string,
    hookId: string,
  ): Promise<Hook | null> {
    await this.enforcePolicy({
      stage: 'runtime',
      tenantId,
      payload: { action: 'assignTaskToHook', taskId, hookId },
    });
    return pool.withTransaction(async (client) => {
      const hookResult = await client.query(
        `UPDATE durable_work_hooks
         SET assigned_task_ids = array_append(assigned_task_ids, $1),
             queue_depth = queue_depth + 1,
             updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3
         RETURNING *`,
        [taskId, hookId, tenantId],
      );

      if (!hookResult.rows[0]) {
        return null;
      }

      await client.query(
        `UPDATE durable_work_tasks
         SET hook_id = $1, status = 'ready', updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3`,
        [hookId, taskId, tenantId],
      );

      await this.recordEvent({
        tenantId,
        entityType: 'hook',
        entityId: hookId,
        eventType: 'hook:assign',
        payload: { taskId },
      });

      return this.toHook(hookResult.rows[0]);
    });
  }

  async claimHookTask(tenantId: string, hookId: string): Promise<WorkTask | null> {
    return pool.withTransaction(async (client) => {
      const hookResult = await client.query(
        `SELECT * FROM durable_work_hooks WHERE id = $1 AND tenant_id = $2`,
        [hookId, tenantId],
      );

      const hook = hookResult.rows[0];
      if (!hook || !hook.assigned_task_ids?.length) {
        return null;
      }

      const taskId = hook.assigned_task_ids[0];
      await client.query(
        `UPDATE durable_work_hooks
         SET assigned_task_ids = array_remove(assigned_task_ids, $1),
             queue_depth = GREATEST(queue_depth - 1, 0),
             last_claimed_at = NOW(),
             updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3`,
        [taskId, hookId, tenantId],
      );

      const taskResult = await client.query(
        `UPDATE durable_work_tasks
         SET status = 'running', updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2
         RETURNING *`,
        [taskId, tenantId],
      );

      await this.recordEvent({
        tenantId,
        entityType: 'hook',
        entityId: hookId,
        eventType: 'hook:claim',
        payload: { taskId },
      });

      return taskResult.rows[0] ? this.toTask(taskResult.rows[0]) : null;
    });
  }

  async listConvoys(tenantId: string): Promise<Convoy[]> {
    const result = await pool.read(
      `SELECT * FROM durable_work_convoys WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId],
    );
    return (result.rows || []).map(this.toConvoy);
  }

  async listHooks(tenantId: string): Promise<Hook[]> {
    const result = await pool.read(
      `SELECT * FROM durable_work_hooks WHERE tenant_id = $1 ORDER BY updated_at DESC`,
      [tenantId],
    );
    return (result.rows || []).map(this.toHook);
  }

  async listRecentEvents(tenantId: string): Promise<DurableEvent[]> {
    const result = await pool.read(
      `SELECT * FROM durable_work_events WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 25`,
      [tenantId],
    );
    return (result.rows || []).map(this.toEvent);
  }

  async getDashboard(tenantId: string) {
    const [convoys, hooks, events] = await Promise.all([
      this.listConvoys(tenantId),
      this.listHooks(tenantId),
      this.listRecentEvents(tenantId),
    ]);

    return { convoys, hooks, events };
  }

  private async recordEvent(input: {
    tenantId: string;
    entityType: DurableEvent['entityType'];
    entityId: string;
    eventType: string;
    payload?: Record<string, unknown>;
    actorAgentId?: string;
    level?: DurableEvent['level'];
  }): Promise<void> {
    await pool.write(
      `INSERT INTO durable_work_events (
        entity_type, entity_id, event_type, level, payload, actor_agent_id, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.entityType,
        input.entityId,
        input.eventType,
        input.level || 'info',
        JSON.stringify(input.payload || {}),
        input.actorAgentId || null,
      input.tenantId,
    ],
  );
  }

  private async enforcePolicy(context: PolicyContext): Promise<void> {
    const verdict = policyEngine.check(context);

    await this.recordEvent({
      tenantId: context.tenantId,
      entityType: 'policy',
      entityId: makeDeterministicId(
        `${context.tenantId}:policy:${context.payload.action || 'unknown'}`,
      ),
      eventType: 'policy-check',
      level: verdict.action === 'DENY' ? 'error' : 'info',
      payload: verdict,
    });

    if (verdict.action === 'DENY') {
      throw new Error(`Policy denied: ${verdict.reasons.join('; ')}`);
    }
  }

  private toTask = (row: any): WorkTask => ({
    id: row.id,
    tenantId: row.tenant_id,
    convoyId: row.convoy_id || undefined,
    formulaId: row.formula_id || undefined,
    moleculeId: row.molecule_id || undefined,
    stepId: row.step_id || undefined,
    status: row.status,
    assigneeAgentId: row.assignee_agent_id || undefined,
    hookId: row.hook_id || undefined,
    idempotencyKey: row.idempotency_key || undefined,
    dependencies: row.dependencies || [],
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    acceptanceCriteria: row.acceptance_criteria || [],
    createdBy: row.created_by,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    dueAt: row.due_at?.toISOString?.() || row.due_at || undefined,
    metadata: row.metadata || {},
  });

  private toConvoy = (row: any): Convoy => ({
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description || undefined,
    status: row.status,
    taskIds: row.task_ids || [],
    moleculeIds: row.molecule_ids || [],
    createdBy: row.created_by,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    targetCompletion: row.target_completion?.toISOString?.() || row.target_completion || undefined,
    progress: row.progress || { totalTasks: 0, completedTasks: 0, failedTasks: 0 },
    metadata: row.metadata || {},
  });

  private toHook = (row: any): Hook => ({
    id: row.id,
    tenantId: row.tenant_id,
    agentId: row.agent_id,
    status: row.status,
    queueDepth: row.queue_depth,
    assignedTaskIds: row.assigned_task_ids || [],
    lastClaimedAt: row.last_claimed_at?.toISOString?.() || row.last_claimed_at || undefined,
    lastHeartbeatAt: row.last_heartbeat_at?.toISOString?.() || row.last_heartbeat_at || undefined,
    metadata: row.metadata || {},
  });

  private toFormula = (row: any): Formula => ({
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    version: row.version,
    description: row.description || undefined,
    template: row.template,
    createdBy: row.created_by,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    metadata: row.metadata || {},
  });

  private toMolecule = (row: any): Molecule => ({
    id: row.id,
    tenantId: row.tenant_id,
    formulaId: row.formula_id,
    convoyId: row.convoy_id,
    status: row.status,
    stepIds: row.step_ids || [],
    cursor: row.cursor || null,
    inputs: row.inputs || {},
    outputs: row.outputs || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
  });

  private toStep = (row: any): MoleculeStep => ({
    id: row.id,
    tenantId: row.tenant_id,
    moleculeId: row.molecule_id,
    name: row.name,
    status: row.status,
    dependsOn: row.depends_on || [],
    acceptanceCriteria: row.acceptance_criteria || [],
    assignedHookId: row.assigned_hook_id || undefined,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    metadata: row.metadata || {},
  });

  private toEvent = (row: any): DurableEvent => ({
    id: String(row.id),
    entityType: row.entity_type,
    entityId: row.entity_id,
    eventType: row.event_type,
    level: row.level,
    payload: row.payload || {},
    actorAgentId: row.actor_agent_id || undefined,
    tenantId: row.tenant_id,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    wispId: row.wisp_id || undefined,
  });
}

export const workOrchestrationService = new WorkOrchestrationService();
