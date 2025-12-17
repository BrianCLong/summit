/**
 * Strategic Plan Repository - Persistence layer for strategic planning
 *
 * Handles CRUD operations for strategic plans and related entities.
 * Uses PostgreSQL for persistent storage with proper transaction support.
 */

import { Pool, PoolClient } from 'pg';
import { randomUUID as uuidv4 } from 'crypto';
import logger from '../config/logger.js';
import { provenanceLedger } from '../provenance/ledger.js';
import type {
  StrategicPlan,
  StrategicObjective,
  Initiative,
  RiskAssessment,
  Milestone,
  Stakeholder,
  ResourceAllocation,
  KeyPerformanceIndicator,
  KeyResult,
  MitigationStrategy,
  Deliverable,
  CreateStrategicPlanInput,
  UpdateStrategicPlanInput,
  CreateObjectiveInput,
  CreateInitiativeInput,
  CreateRiskInput,
  CreateMilestoneInput,
  AddStakeholderInput,
  AllocateResourceInput,
  CreateKPIInput,
  StrategicPlanFilter,
  StrategicPlanRow,
  ObjectiveRow,
  InitiativeRow,
  RiskRow,
  MilestoneRow,
  StakeholderRow,
  ResourceRow,
  KPIRow,
  PlanStatus,
  PlanPriority,
  TimeHorizon,
  ObjectiveStatus,
  InitiativeType,
  RiskCategory,
  RiskLevel,
  MilestoneStatus,
  ResourceType,
  StakeholderRole,
} from '../types/strategic-planning.js';

const repoLogger = logger.child({ name: 'StrategicPlanRepo' });

export class StrategicPlanRepo {
  constructor(private pg: Pool) {}

  // ============================================================================
  // STRATEGIC PLANS
  // ============================================================================

  async createPlan(
    input: CreateStrategicPlanInput,
    userId: string,
  ): Promise<StrategicPlan> {
    const id = uuidv4();

    const { rows } = await this.pg.query(
      `INSERT INTO strategic_plans (
        id, tenant_id, investigation_id, name, description, priority,
        time_horizon, start_date, end_date, assumptions, constraints,
        tags, metadata, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        id,
        input.tenantId,
        input.investigationId || null,
        input.name,
        input.description,
        input.priority,
        input.timeHorizon,
        input.startDate,
        input.endDate,
        input.assumptions || [],
        input.constraints || [],
        input.tags || [],
        JSON.stringify(input.metadata || {}),
        userId,
      ],
    );

    const plan = this.mapPlanRow(rows[0]);

    provenanceLedger
      .appendEntry({
        tenantId: input.tenantId,
        actionType: 'STRATEGIC_PLAN_CREATED',
        resourceType: 'strategic_plan',
        resourceId: plan.id,
        actorId: userId,
        actorType: 'user',
        payload: { name: input.name },
        metadata: {},
      })
      .catch((err) =>
        repoLogger.error('Failed to record plan creation', err),
      );

    repoLogger.info({ planId: plan.id }, 'Strategic plan created');
    return plan;
  }

  async updatePlan(
    id: string,
    input: UpdateStrategicPlanInput,
    userId: string,
  ): Promise<StrategicPlan | null> {
    const updateFields: string[] = [];
    const params: unknown[] = [id];
    let paramIndex = 2;

    if (input.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      params.push(input.name);
      paramIndex++;
    }

    if (input.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      params.push(input.description);
      paramIndex++;
    }

    if (input.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      params.push(input.status);
      paramIndex++;

      if (input.status === 'APPROVED') {
        updateFields.push(`approved_by = $${paramIndex}`);
        params.push(userId);
        paramIndex++;
        updateFields.push(`approved_at = now()`);
      }
    }

    if (input.priority !== undefined) {
      updateFields.push(`priority = $${paramIndex}`);
      params.push(input.priority);
      paramIndex++;
    }

    if (input.timeHorizon !== undefined) {
      updateFields.push(`time_horizon = $${paramIndex}`);
      params.push(input.timeHorizon);
      paramIndex++;
    }

    if (input.startDate !== undefined) {
      updateFields.push(`start_date = $${paramIndex}`);
      params.push(input.startDate);
      paramIndex++;
    }

    if (input.endDate !== undefined) {
      updateFields.push(`end_date = $${paramIndex}`);
      params.push(input.endDate);
      paramIndex++;
    }

    if (input.assumptions !== undefined) {
      updateFields.push(`assumptions = $${paramIndex}`);
      params.push(input.assumptions);
      paramIndex++;
    }

    if (input.constraints !== undefined) {
      updateFields.push(`constraints = $${paramIndex}`);
      params.push(input.constraints);
      paramIndex++;
    }

    if (input.tags !== undefined) {
      updateFields.push(`tags = $${paramIndex}`);
      params.push(input.tags);
      paramIndex++;
    }

    if (input.metadata !== undefined) {
      updateFields.push(`metadata = $${paramIndex}`);
      params.push(JSON.stringify(input.metadata));
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return this.findPlanById(id);
    }

    updateFields.push(`version = version + 1`);

    const { rows } = await this.pg.query(
      `UPDATE strategic_plans SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`,
      params,
    );

    if (!rows[0]) return null;

    const plan = this.mapPlanRow(rows[0]);

    provenanceLedger
      .appendEntry({
        tenantId: plan.tenantId,
        actionType: 'STRATEGIC_PLAN_UPDATED',
        resourceType: 'strategic_plan',
        resourceId: plan.id,
        actorId: userId,
        actorType: 'user',
        payload: { updates: input },
        metadata: {},
      })
      .catch((err) =>
        repoLogger.error('Failed to record plan update', err),
      );

    return plan;
  }

  async deletePlan(id: string, userId: string): Promise<boolean> {
    const client = await this.pg.connect();

    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `DELETE FROM strategic_plans WHERE id = $1 RETURNING tenant_id`,
        [id],
      );

      await client.query('COMMIT');

      if (rows.length > 0) {
        provenanceLedger
          .appendEntry({
            tenantId: rows[0].tenant_id,
            actionType: 'STRATEGIC_PLAN_DELETED',
            resourceType: 'strategic_plan',
            resourceId: id,
            actorId: userId,
            actorType: 'user',
            payload: {},
            metadata: {},
          })
          .catch((err) =>
            repoLogger.error('Failed to record plan deletion', err),
          );

        repoLogger.info({ planId: id }, 'Strategic plan deleted');
        return true;
      }

      return false;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findPlanById(id: string, tenantId?: string): Promise<StrategicPlan | null> {
    const params: unknown[] = [id];
    let query = `SELECT * FROM strategic_plans WHERE id = $1`;

    if (tenantId) {
      query += ` AND tenant_id = $2`;
      params.push(tenantId);
    }

    const { rows } = await this.pg.query(query, params);
    if (!rows[0]) return null;

    const plan = this.mapPlanRow(rows[0]);
    return this.loadPlanRelations(plan);
  }

  async listPlans(
    tenantId: string,
    filter: StrategicPlanFilter = {},
    limit = 50,
    offset = 0,
  ): Promise<{ data: StrategicPlan[]; total: number }> {
    const params: unknown[] = [tenantId];
    const conditions: string[] = ['tenant_id = $1'];
    let paramIndex = 2;

    if (filter.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filter.status);
      paramIndex++;
    }

    if (filter.priority) {
      conditions.push(`priority = $${paramIndex}`);
      params.push(filter.priority);
      paramIndex++;
    }

    if (filter.timeHorizon) {
      conditions.push(`time_horizon = $${paramIndex}`);
      params.push(filter.timeHorizon);
      paramIndex++;
    }

    if (filter.investigationId) {
      conditions.push(`investigation_id = $${paramIndex}`);
      params.push(filter.investigationId);
      paramIndex++;
    }

    if (filter.createdBy) {
      conditions.push(`created_by = $${paramIndex}`);
      params.push(filter.createdBy);
      paramIndex++;
    }

    if (filter.startDateFrom) {
      conditions.push(`start_date >= $${paramIndex}`);
      params.push(filter.startDateFrom);
      paramIndex++;
    }

    if (filter.startDateTo) {
      conditions.push(`start_date <= $${paramIndex}`);
      params.push(filter.startDateTo);
      paramIndex++;
    }

    if (filter.tags && filter.tags.length > 0) {
      conditions.push(`tags && $${paramIndex}`);
      params.push(filter.tags);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pg.query(
      `SELECT COUNT(*) FROM strategic_plans WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(Math.min(limit, 100), offset);
    const { rows } = await this.pg.query(
      `SELECT * FROM strategic_plans
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params,
    );

    const plans = rows.map((row) => this.mapPlanRow(row));

    return { data: plans, total };
  }

  async batchByIds(
    ids: readonly string[],
    tenantId?: string,
  ): Promise<(StrategicPlan | null)[]> {
    if (ids.length === 0) return [];

    const params: unknown[] = [ids];
    let query = `SELECT * FROM strategic_plans WHERE id = ANY($1)`;

    if (tenantId) {
      query += ` AND tenant_id = $2`;
      params.push(tenantId);
    }

    const { rows } = await this.pg.query(query, params);
    const plansMap = new Map(
      rows.map((row) => [row.id, this.mapPlanRow(row)]),
    );

    return ids.map((id) => plansMap.get(id) || null);
  }

  // ============================================================================
  // OBJECTIVES
  // ============================================================================

  async createObjective(
    input: CreateObjectiveInput,
    userId: string,
  ): Promise<StrategicObjective> {
    const id = uuidv4();

    const { rows } = await this.pg.query(
      `INSERT INTO strategic_objectives (
        id, plan_id, name, description, priority, target_value, unit,
        start_date, target_date, aligned_intelligence_priorities,
        success_criteria, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id,
        input.planId,
        input.name,
        input.description,
        input.priority,
        input.targetValue,
        input.unit,
        input.startDate,
        input.targetDate,
        input.alignedIntelligencePriorities || [],
        input.successCriteria || [],
        userId,
      ],
    );

    await this.recordActivity(
      input.planId,
      'objective',
      id,
      'CREATED',
      userId,
      { name: input.name },
    );

    return this.mapObjectiveRow(rows[0]);
  }

  async updateObjective(
    id: string,
    updates: Partial<StrategicObjective>,
    userId: string,
  ): Promise<StrategicObjective | null> {
    const updateFields: string[] = [];
    const params: unknown[] = [id];
    let paramIndex = 2;

    const allowedFields = [
      'name', 'description', 'status', 'priority', 'target_value',
      'current_value', 'unit', 'start_date', 'target_date',
      'aligned_intelligence_priorities', 'success_criteria', 'dependencies',
    ];

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (updates[camelField as keyof StrategicObjective] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        params.push(updates[camelField as keyof StrategicObjective]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return this.findObjectiveById(id);
    }

    const { rows } = await this.pg.query(
      `UPDATE strategic_objectives SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`,
      params,
    );

    if (!rows[0]) return null;

    const objective = this.mapObjectiveRow(rows[0]);

    await this.recordActivity(
      objective.planId,
      'objective',
      id,
      'UPDATED',
      userId,
      { updates },
    );

    return objective;
  }

  async findObjectiveById(id: string): Promise<StrategicObjective | null> {
    const { rows } = await this.pg.query(
      `SELECT * FROM strategic_objectives WHERE id = $1`,
      [id],
    );

    if (!rows[0]) return null;

    const objective = this.mapObjectiveRow(rows[0]);
    objective.milestones = await this.getMilestones(id, 'objective');
    objective.keyResults = await this.getKeyResults(id);

    return objective;
  }

  async getObjectivesByPlan(planId: string): Promise<StrategicObjective[]> {
    const { rows } = await this.pg.query(
      `SELECT * FROM strategic_objectives WHERE plan_id = $1 ORDER BY created_at ASC`,
      [planId],
    );

    return Promise.all(
      rows.map(async (row) => {
        const objective = this.mapObjectiveRow(row);
        objective.milestones = await this.getMilestones(objective.id, 'objective');
        objective.keyResults = await this.getKeyResults(objective.id);
        return objective;
      }),
    );
  }

  async deleteObjective(id: string, userId: string): Promise<boolean> {
    const { rows } = await this.pg.query(
      `DELETE FROM strategic_objectives WHERE id = $1 RETURNING plan_id`,
      [id],
    );

    if (rows.length > 0) {
      await this.recordActivity(
        rows[0].plan_id,
        'objective',
        id,
        'DELETED',
        userId,
        {},
      );
      return true;
    }

    return false;
  }

  // ============================================================================
  // KEY RESULTS
  // ============================================================================

  async createKeyResult(
    objectiveId: string,
    input: {
      description: string;
      targetValue: number;
      unit: string;
      weight?: number;
      dueDate: string;
    },
  ): Promise<KeyResult> {
    const id = uuidv4();

    const { rows } = await this.pg.query(
      `INSERT INTO strategic_key_results (
        id, objective_id, description, target_value, unit, weight, due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        id,
        objectiveId,
        input.description,
        input.targetValue,
        input.unit,
        input.weight || 1.0,
        input.dueDate,
      ],
    );

    return this.mapKeyResultRow(rows[0]);
  }

  async getKeyResults(objectiveId: string): Promise<KeyResult[]> {
    const { rows } = await this.pg.query(
      `SELECT * FROM strategic_key_results WHERE objective_id = $1 ORDER BY due_date ASC`,
      [objectiveId],
    );

    return rows.map((row) => this.mapKeyResultRow(row));
  }

  async updateKeyResultProgress(
    id: string,
    currentValue: number,
    status?: ObjectiveStatus,
  ): Promise<KeyResult | null> {
    const { rows } = await this.pg.query(
      `UPDATE strategic_key_results
       SET current_value = $2, status = COALESCE($3, status)
       WHERE id = $1
       RETURNING *`,
      [id, currentValue, status || null],
    );

    return rows[0] ? this.mapKeyResultRow(rows[0]) : null;
  }

  // ============================================================================
  // INITIATIVES
  // ============================================================================

  async createInitiative(
    input: CreateInitiativeInput,
    userId: string,
  ): Promise<Initiative> {
    const id = uuidv4();

    const { rows } = await this.pg.query(
      `INSERT INTO strategic_initiatives (
        id, plan_id, objective_ids, name, description, type, priority,
        start_date, end_date, budget, assigned_to, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id,
        input.planId,
        input.objectiveIds,
        input.name,
        input.description,
        input.type,
        input.priority,
        input.startDate,
        input.endDate,
        input.budget || null,
        input.assignedTo || [],
        userId,
      ],
    );

    await this.recordActivity(
      input.planId,
      'initiative',
      id,
      'CREATED',
      userId,
      { name: input.name },
    );

    return this.mapInitiativeRow(rows[0]);
  }

  async updateInitiative(
    id: string,
    updates: Partial<Initiative>,
    userId: string,
  ): Promise<Initiative | null> {
    const updateFields: string[] = [];
    const params: unknown[] = [id];
    let paramIndex = 2;

    const allowedFields = [
      'name', 'description', 'type', 'status', 'priority',
      'start_date', 'end_date', 'budget', 'budget_used',
      'assigned_to', 'risks', 'dependencies', 'objective_ids',
    ];

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (updates[camelField as keyof Initiative] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        params.push(updates[camelField as keyof Initiative]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return this.findInitiativeById(id);
    }

    const { rows } = await this.pg.query(
      `UPDATE strategic_initiatives SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`,
      params,
    );

    if (!rows[0]) return null;

    const initiative = this.mapInitiativeRow(rows[0]);

    await this.recordActivity(
      initiative.planId,
      'initiative',
      id,
      'UPDATED',
      userId,
      { updates },
    );

    return initiative;
  }

  async findInitiativeById(id: string): Promise<Initiative | null> {
    const { rows } = await this.pg.query(
      `SELECT * FROM strategic_initiatives WHERE id = $1`,
      [id],
    );

    if (!rows[0]) return null;

    const initiative = this.mapInitiativeRow(rows[0]);
    initiative.milestones = await this.getMilestones(id, 'initiative');
    initiative.deliverables = await this.getDeliverables(id);

    return initiative;
  }

  async getInitiativesByPlan(planId: string): Promise<Initiative[]> {
    const { rows } = await this.pg.query(
      `SELECT * FROM strategic_initiatives WHERE plan_id = $1 ORDER BY start_date ASC`,
      [planId],
    );

    return Promise.all(
      rows.map(async (row) => {
        const initiative = this.mapInitiativeRow(row);
        initiative.milestones = await this.getMilestones(initiative.id, 'initiative');
        initiative.deliverables = await this.getDeliverables(initiative.id);
        return initiative;
      }),
    );
  }

  async deleteInitiative(id: string, userId: string): Promise<boolean> {
    const { rows } = await this.pg.query(
      `DELETE FROM strategic_initiatives WHERE id = $1 RETURNING plan_id`,
      [id],
    );

    if (rows.length > 0) {
      await this.recordActivity(
        rows[0].plan_id,
        'initiative',
        id,
        'DELETED',
        userId,
        {},
      );
      return true;
    }

    return false;
  }

  // ============================================================================
  // DELIVERABLES
  // ============================================================================

  async createDeliverable(
    initiativeId: string,
    input: {
      name: string;
      description: string;
      type: string;
      dueDate: string;
    },
  ): Promise<Deliverable> {
    const id = uuidv4();

    const { rows } = await this.pg.query(
      `INSERT INTO strategic_deliverables (id, initiative_id, name, description, type, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, initiativeId, input.name, input.description, input.type, input.dueDate],
    );

    return this.mapDeliverableRow(rows[0]);
  }

  async getDeliverables(initiativeId: string): Promise<Deliverable[]> {
    const { rows } = await this.pg.query(
      `SELECT * FROM strategic_deliverables WHERE initiative_id = $1 ORDER BY due_date ASC`,
      [initiativeId],
    );

    return rows.map((row) => this.mapDeliverableRow(row));
  }

  async updateDeliverableStatus(
    id: string,
    status: MilestoneStatus,
    completedAt?: Date,
  ): Promise<Deliverable | null> {
    const { rows } = await this.pg.query(
      `UPDATE strategic_deliverables
       SET status = $2, completed_at = $3
       WHERE id = $1
       RETURNING *`,
      [id, status, completedAt || null],
    );

    return rows[0] ? this.mapDeliverableRow(rows[0]) : null;
  }

  // ============================================================================
  // MILESTONES
  // ============================================================================

  async createMilestone(
    input: CreateMilestoneInput,
    userId: string,
  ): Promise<Milestone> {
    const id = uuidv4();

    const { rows } = await this.pg.query(
      `INSERT INTO strategic_milestones (
        id, parent_id, parent_type, name, description, due_date, deliverables
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        id,
        input.parentId,
        input.parentType,
        input.name,
        input.description,
        input.dueDate,
        input.deliverables || [],
      ],
    );

    return this.mapMilestoneRow(rows[0]);
  }

  async getMilestones(
    parentId: string,
    parentType: 'objective' | 'initiative',
  ): Promise<Milestone[]> {
    const { rows } = await this.pg.query(
      `SELECT * FROM strategic_milestones
       WHERE parent_id = $1 AND parent_type = $2
       ORDER BY due_date ASC`,
      [parentId, parentType],
    );

    return rows.map((row) => this.mapMilestoneRow(row));
  }

  async updateMilestoneStatus(
    id: string,
    status: MilestoneStatus,
    userId: string,
    completedAt?: Date,
  ): Promise<Milestone | null> {
    const { rows } = await this.pg.query(
      `UPDATE strategic_milestones
       SET status = $2, completed_at = $3, completed_by = $4
       WHERE id = $1
       RETURNING *`,
      [id, status, status === 'COMPLETED' ? completedAt || new Date() : null, status === 'COMPLETED' ? userId : null],
    );

    return rows[0] ? this.mapMilestoneRow(rows[0]) : null;
  }

  // ============================================================================
  // RISKS
  // ============================================================================

  async createRisk(input: CreateRiskInput, userId: string): Promise<RiskAssessment> {
    const id = uuidv4();
    const riskScore = input.likelihood * input.impact;
    const riskLevel = this.calculateRiskLevel(riskScore);

    const { rows } = await this.pg.query(
      `INSERT INTO strategic_risks (
        id, plan_id, name, description, category, likelihood, impact,
        risk_level, contingency_plans, owner, review_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        id,
        input.planId,
        input.name,
        input.description,
        input.category,
        input.likelihood,
        input.impact,
        riskLevel,
        input.contingencyPlans || [],
        userId,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      ],
    );

    await this.recordActivity(
      input.planId,
      'risk',
      id,
      'CREATED',
      userId,
      { name: input.name, riskLevel },
    );

    return this.mapRiskRow(rows[0]);
  }

  async updateRisk(
    id: string,
    updates: Partial<RiskAssessment>,
    userId: string,
  ): Promise<RiskAssessment | null> {
    const updateFields: string[] = [];
    const params: unknown[] = [id];
    let paramIndex = 2;

    const allowedFields = [
      'name', 'description', 'category', 'likelihood', 'impact',
      'status', 'contingency_plans', 'owner', 'review_date',
    ];

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (updates[camelField as keyof RiskAssessment] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        params.push(updates[camelField as keyof RiskAssessment]);
        paramIndex++;
      }
    }

    if (updates.likelihood !== undefined || updates.impact !== undefined) {
      const { rows: current } = await this.pg.query(
        `SELECT likelihood, impact FROM strategic_risks WHERE id = $1`,
        [id],
      );

      if (current[0]) {
        const newLikelihood = updates.likelihood ?? current[0].likelihood;
        const newImpact = updates.impact ?? current[0].impact;
        const riskLevel = this.calculateRiskLevel(newLikelihood * newImpact);

        updateFields.push(`risk_level = $${paramIndex}`);
        params.push(riskLevel);
        paramIndex++;
      }
    }

    updateFields.push(`last_assessed_at = now()`);

    if (updateFields.length === 0) {
      const { rows } = await this.pg.query(
        `SELECT * FROM strategic_risks WHERE id = $1`,
        [id],
      );
      return rows[0] ? this.mapRiskRow(rows[0]) : null;
    }

    const { rows } = await this.pg.query(
      `UPDATE strategic_risks SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`,
      params,
    );

    if (!rows[0]) return null;

    const risk = this.mapRiskRow(rows[0]);

    await this.recordActivity(
      risk.planId,
      'risk',
      id,
      'UPDATED',
      userId,
      { updates },
    );

    return risk;
  }

  async getRisksByPlan(planId: string): Promise<RiskAssessment[]> {
    const { rows } = await this.pg.query(
      `SELECT * FROM strategic_risks WHERE plan_id = $1 ORDER BY risk_score DESC`,
      [planId],
    );

    return Promise.all(
      rows.map(async (row) => {
        const risk = this.mapRiskRow(row);
        risk.mitigationStrategies = await this.getMitigationStrategies(risk.id);
        return risk;
      }),
    );
  }

  async createMitigationStrategy(
    riskId: string,
    input: {
      description: string;
      type: 'AVOID' | 'MITIGATE' | 'TRANSFER' | 'ACCEPT';
      owner: string;
      deadline: string;
      cost?: number;
    },
  ): Promise<MitigationStrategy> {
    const id = uuidv4();

    const { rows } = await this.pg.query(
      `INSERT INTO strategic_mitigations (id, risk_id, description, type, owner, deadline, cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, riskId, input.description, input.type, input.owner, input.deadline, input.cost || null],
    );

    return this.mapMitigationRow(rows[0]);
  }

  async getMitigationStrategies(riskId: string): Promise<MitigationStrategy[]> {
    const { rows } = await this.pg.query(
      `SELECT * FROM strategic_mitigations WHERE risk_id = $1 ORDER BY deadline ASC`,
      [riskId],
    );

    return rows.map((row) => this.mapMitigationRow(row));
  }

  // ============================================================================
  // STAKEHOLDERS
  // ============================================================================

  async addStakeholder(input: AddStakeholderInput, addedBy: string): Promise<Stakeholder> {
    const id = uuidv4();

    const { rows } = await this.pg.query(
      `INSERT INTO strategic_stakeholders (
        id, plan_id, user_id, name, role, responsibilities, added_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (plan_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        responsibilities = EXCLUDED.responsibilities
      RETURNING *`,
      [
        id,
        input.planId,
        input.userId,
        input.name,
        input.role,
        input.responsibilities || [],
        addedBy,
      ],
    );

    return this.mapStakeholderRow(rows[0]);
  }

  async getStakeholdersByPlan(planId: string): Promise<Stakeholder[]> {
    const { rows } = await this.pg.query(
      `SELECT * FROM strategic_stakeholders WHERE plan_id = $1 ORDER BY role ASC`,
      [planId],
    );

    return rows.map((row) => this.mapStakeholderRow(row));
  }

  async removeStakeholder(planId: string, userId: string): Promise<boolean> {
    const { rowCount } = await this.pg.query(
      `DELETE FROM strategic_stakeholders WHERE plan_id = $1 AND user_id = $2`,
      [planId, userId],
    );

    return (rowCount ?? 0) > 0;
  }

  // ============================================================================
  // RESOURCES
  // ============================================================================

  async allocateResource(input: AllocateResourceInput): Promise<ResourceAllocation> {
    const id = uuidv4();

    const { rows } = await this.pg.query(
      `INSERT INTO strategic_resources (
        id, plan_id, type, name, description, allocated, unit, start_date, end_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        id,
        input.planId,
        input.type,
        input.name,
        input.description,
        input.allocated,
        input.unit,
        input.startDate,
        input.endDate,
      ],
    );

    return this.mapResourceRow(rows[0]);
  }

  async getResourcesByPlan(planId: string): Promise<ResourceAllocation[]> {
    const { rows } = await this.pg.query(
      `SELECT * FROM strategic_resources WHERE plan_id = $1 ORDER BY type ASC`,
      [planId],
    );

    return rows.map((row) => this.mapResourceRow(row));
  }

  async updateResourceUsage(
    id: string,
    used: number,
    status?: 'PLANNED' | 'ALLOCATED' | 'IN_USE' | 'RELEASED',
  ): Promise<ResourceAllocation | null> {
    const { rows } = await this.pg.query(
      `UPDATE strategic_resources
       SET used = $2, status = COALESCE($3, status)
       WHERE id = $1
       RETURNING *`,
      [id, used, status || null],
    );

    return rows[0] ? this.mapResourceRow(rows[0]) : null;
  }

  // ============================================================================
  // KPIs
  // ============================================================================

  async createKPI(input: CreateKPIInput): Promise<KeyPerformanceIndicator> {
    const id = uuidv4();

    const { rows } = await this.pg.query(
      `INSERT INTO strategic_kpis (
        id, plan_id, name, description, formula, target_value, unit, frequency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        id,
        input.planId,
        input.name,
        input.description,
        input.formula,
        input.targetValue,
        input.unit,
        input.frequency,
      ],
    );

    return this.mapKPIRow(rows[0]);
  }

  async getKPIsByPlan(planId: string): Promise<KeyPerformanceIndicator[]> {
    const { rows } = await this.pg.query(
      `SELECT * FROM strategic_kpis WHERE plan_id = $1 ORDER BY name ASC`,
      [planId],
    );

    return rows.map((row) => this.mapKPIRow(row));
  }

  async updateKPIValue(
    id: string,
    currentValue: number,
    notes?: string,
  ): Promise<KeyPerformanceIndicator | null> {
    const { rows: current } = await this.pg.query(
      `SELECT current_value, history FROM strategic_kpis WHERE id = $1`,
      [id],
    );

    if (!current[0]) return null;

    const previousValue = current[0].current_value;
    const history = current[0].history || [];

    history.push({
      timestamp: new Date().toISOString(),
      value: currentValue,
      notes,
    });

    let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
    if (currentValue > previousValue) trend = 'UP';
    else if (currentValue < previousValue) trend = 'DOWN';

    const { rows } = await this.pg.query(
      `UPDATE strategic_kpis
       SET current_value = $2, trend = $3, history = $4, last_updated = now()
       WHERE id = $1
       RETURNING *`,
      [id, currentValue, trend, JSON.stringify(history)],
    );

    return rows[0] ? this.mapKPIRow(rows[0]) : null;
  }

  // ============================================================================
  // ACTIVITY LOG
  // ============================================================================

  async recordActivity(
    planId: string,
    entityType: string,
    entityId: string,
    action: string,
    actorId: string,
    changes: Record<string, unknown>,
  ): Promise<void> {
    await this.pg.query(
      `INSERT INTO strategic_plan_activities (plan_id, entity_type, entity_id, action, actor_id, changes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [planId, entityType, entityId, action, actorId, JSON.stringify(changes)],
    );
  }

  async getActivityLog(
    planId: string,
    limit = 50,
  ): Promise<
    Array<{
      id: string;
      entityType: string;
      entityId: string;
      action: string;
      actorId: string;
      changes: Record<string, unknown>;
      createdAt: Date;
    }>
  > {
    const { rows } = await this.pg.query(
      `SELECT * FROM strategic_plan_activities
       WHERE plan_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [planId, limit],
    );

    return rows.map((row) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: row.action,
      actorId: row.actor_id,
      changes: row.changes,
      createdAt: row.created_at,
    }));
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async loadPlanRelations(plan: StrategicPlan): Promise<StrategicPlan> {
    const [objectives, initiatives, risks, stakeholders, resources, kpis] =
      await Promise.all([
        this.getObjectivesByPlan(plan.id),
        this.getInitiativesByPlan(plan.id),
        this.getRisksByPlan(plan.id),
        this.getStakeholdersByPlan(plan.id),
        this.getResourcesByPlan(plan.id),
        this.getKPIsByPlan(plan.id),
      ]);

    return {
      ...plan,
      objectives,
      initiatives,
      risks,
      stakeholders,
      resources,
      kpis,
    };
  }

  private calculateRiskLevel(score: number): RiskLevel {
    if (score >= 20) return 'CRITICAL';
    if (score >= 12) return 'HIGH';
    if (score >= 6) return 'MEDIUM';
    return 'LOW';
  }

  // ============================================================================
  // ROW MAPPERS
  // ============================================================================

  private mapPlanRow(row: StrategicPlanRow): StrategicPlan {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      investigationId: row.investigation_id || undefined,
      name: row.name,
      description: row.description,
      status: row.status as PlanStatus,
      priority: row.priority as PlanPriority,
      timeHorizon: row.time_horizon as TimeHorizon,
      startDate: row.start_date,
      endDate: row.end_date,
      objectives: [],
      initiatives: [],
      risks: [],
      stakeholders: [],
      resources: [],
      kpis: [],
      assumptions: row.assumptions,
      constraints: row.constraints,
      dependencies: row.dependencies,
      tags: row.tags,
      metadata: row.metadata,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      approvedBy: row.approved_by || undefined,
      approvedAt: row.approved_at || undefined,
      version: row.version,
    };
  }

  private mapObjectiveRow(row: ObjectiveRow): StrategicObjective {
    return {
      id: row.id,
      planId: row.plan_id,
      name: row.name,
      description: row.description,
      status: row.status as ObjectiveStatus,
      priority: row.priority as PlanPriority,
      targetValue: Number(row.target_value),
      currentValue: Number(row.current_value),
      unit: row.unit,
      startDate: row.start_date,
      targetDate: row.target_date,
      milestones: [],
      keyResults: [],
      alignedIntelligencePriorities: row.aligned_intelligence_priorities,
      successCriteria: row.success_criteria,
      dependencies: row.dependencies,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapKeyResultRow(row: {
    id: string;
    objective_id: string;
    description: string;
    target_value: number;
    current_value: number;
    unit: string;
    weight: number;
    status: string;
    due_date: Date;
    updated_at: Date;
  }): KeyResult {
    return {
      id: row.id,
      objectiveId: row.objective_id,
      description: row.description,
      targetValue: Number(row.target_value),
      currentValue: Number(row.current_value),
      unit: row.unit,
      weight: Number(row.weight),
      status: row.status as ObjectiveStatus,
      dueDate: row.due_date,
      updatedAt: row.updated_at,
    };
  }

  private mapInitiativeRow(row: InitiativeRow): Initiative {
    return {
      id: row.id,
      planId: row.plan_id,
      objectiveIds: row.objective_ids,
      name: row.name,
      description: row.description,
      type: row.type as InitiativeType,
      status: row.status as ObjectiveStatus,
      priority: row.priority as PlanPriority,
      startDate: row.start_date,
      endDate: row.end_date,
      budget: row.budget ? Number(row.budget) : undefined,
      budgetUsed: row.budget_used ? Number(row.budget_used) : undefined,
      assignedTo: row.assigned_to,
      milestones: [],
      deliverables: [],
      risks: row.risks,
      dependencies: row.dependencies,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapDeliverableRow(row: {
    id: string;
    initiative_id: string;
    name: string;
    description: string;
    type: string;
    status: string;
    due_date: Date;
    completed_at: Date | null;
    artifacts: string[];
  }): Deliverable {
    return {
      id: row.id,
      initiativeId: row.initiative_id,
      name: row.name,
      description: row.description,
      type: row.type,
      status: row.status as MilestoneStatus,
      dueDate: row.due_date,
      completedAt: row.completed_at || undefined,
      artifacts: row.artifacts,
    };
  }

  private mapMilestoneRow(row: MilestoneRow): Milestone {
    return {
      id: row.id,
      parentId: row.parent_id,
      parentType: row.parent_type as 'objective' | 'initiative',
      name: row.name,
      description: row.description,
      status: row.status as MilestoneStatus,
      dueDate: row.due_date,
      completedAt: row.completed_at || undefined,
      completedBy: row.completed_by || undefined,
      deliverables: row.deliverables,
      dependencies: row.dependencies,
    };
  }

  private mapRiskRow(row: RiskRow): RiskAssessment {
    return {
      id: row.id,
      planId: row.plan_id,
      name: row.name,
      description: row.description,
      category: row.category as RiskCategory,
      likelihood: row.likelihood,
      impact: row.impact,
      riskScore: row.risk_score,
      riskLevel: row.risk_level as RiskLevel,
      status: row.status as RiskAssessment['status'],
      mitigationStrategies: [],
      contingencyPlans: row.contingency_plans,
      owner: row.owner,
      identifiedAt: row.identified_at,
      lastAssessedAt: row.last_assessed_at,
      reviewDate: row.review_date,
    };
  }

  private mapMitigationRow(row: {
    id: string;
    risk_id: string;
    description: string;
    type: string;
    status: string;
    effectiveness: number;
    cost: number | null;
    owner: string;
    deadline: Date;
  }): MitigationStrategy {
    return {
      id: row.id,
      riskId: row.risk_id,
      description: row.description,
      type: row.type as MitigationStrategy['type'],
      status: row.status as MitigationStrategy['status'],
      effectiveness: Number(row.effectiveness),
      cost: row.cost ? Number(row.cost) : undefined,
      owner: row.owner,
      deadline: row.deadline,
    };
  }

  private mapStakeholderRow(row: StakeholderRow): Stakeholder {
    return {
      id: row.id,
      planId: row.plan_id,
      userId: row.user_id,
      name: row.name,
      role: row.role as StakeholderRole,
      responsibilities: row.responsibilities,
      communicationPreferences: row.communication_preferences as Stakeholder['communicationPreferences'],
      addedAt: row.added_at,
      addedBy: row.added_by,
    };
  }

  private mapResourceRow(row: ResourceRow): ResourceAllocation {
    return {
      id: row.id,
      planId: row.plan_id,
      type: row.type as ResourceType,
      name: row.name,
      description: row.description,
      allocated: Number(row.allocated),
      used: Number(row.used),
      unit: row.unit,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status as ResourceAllocation['status'],
    };
  }

  private mapKPIRow(row: KPIRow): KeyPerformanceIndicator {
    return {
      id: row.id,
      planId: row.plan_id,
      name: row.name,
      description: row.description,
      formula: row.formula,
      targetValue: Number(row.target_value),
      currentValue: Number(row.current_value),
      unit: row.unit,
      frequency: row.frequency as KeyPerformanceIndicator['frequency'],
      trend: row.trend as KeyPerformanceIndicator['trend'],
      lastUpdated: row.last_updated,
      history: row.history || [],
    };
  }
}
