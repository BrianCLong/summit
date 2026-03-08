"use strict";
// @ts-nocheck
/**
 * Strategic Plan Repository - Persistence layer for strategic planning
 *
 * Handles CRUD operations for strategic plans and related entities.
 * Uses PostgreSQL for persistent storage with proper transaction support.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategicPlanRepo = void 0;
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const logger = logger_js_1.default.default || logger_js_1.default;
const ledger_js_1 = require("../provenance/ledger.js");
const repoLogger = typeof logger.child === 'function' ? logger.child({ name: 'StrategicPlanRepo' }) : logger;
class StrategicPlanRepo {
    pg;
    constructor(pg) {
        this.pg = pg;
    }
    // ============================================================================
    // STRATEGIC PLANS
    // ============================================================================
    async createPlan(input, userId) {
        const id = (0, crypto_1.randomUUID)();
        const queryRes = await this.pg.query(`INSERT INTO strategic_plans (
        id, tenant_id, investigation_id, name, description, priority,
        time_horizon, start_date, end_date, assumptions, constraints,
        tags, metadata, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`, [
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
        ]);
        const rows = queryRes?.rows || [];
        const plan = this.mapPlanRow(rows[0]);
        ledger_js_1.provenanceLedger
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
            .catch((err) => repoLogger.error('Failed to record plan creation', err instanceof Error ? err.message : String(err)));
        repoLogger.info({ planId: plan.id }, 'Strategic plan created');
        return plan;
    }
    async updatePlan(id, input, userId) {
        const updateFields = [];
        const params = [id];
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
        const queryRes = await this.pg.query(`UPDATE strategic_plans SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`, params);
        const rows = queryRes?.rows || [];
        if (!rows[0])
            return null;
        const plan = this.mapPlanRow(rows[0]);
        ledger_js_1.provenanceLedger
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
            .catch((err) => repoLogger.error('Failed to record plan update', err instanceof Error ? err.message : String(err)));
        return plan;
    }
    async deletePlan(id, userId) {
        const client = await this.pg.connect();
        try {
            await client.query('BEGIN');
            const queryRes = await client.query(`DELETE FROM strategic_plans WHERE id = $1 RETURNING tenant_id`, [id]);
            const rows = queryRes?.rows || [];
            await client.query('COMMIT');
            if (rows.length > 0) {
                ledger_js_1.provenanceLedger
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
                    .catch((err) => repoLogger.error('Failed to record plan deletion', err instanceof Error ? err.message : String(err)));
                repoLogger.info({ planId: id }, 'Strategic plan deleted');
                return true;
            }
            return false;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async findPlanById(id, tenantId) {
        const params = [id];
        let query = `SELECT * FROM strategic_plans WHERE id = $1`;
        if (tenantId) {
            query += ` AND tenant_id = $2`;
            params.push(tenantId);
        }
        const queryRes = await this.pg.query(query, params);
        const rows = queryRes?.rows || [];
        if (!rows[0])
            return null;
        const plan = this.mapPlanRow(rows[0]);
        return this.loadPlanRelations(plan);
    }
    async listPlans(tenantId, filter = {}, limit = 50, offset = 0) {
        const params = [tenantId];
        const conditions = ['tenant_id = $1'];
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
        // BOLT OPTIMIZATION: Parallelize count and data queries to reduce latency.
        // We clone the params array (CoW pattern) to prevent mutation race conditions between concurrent queries.
        const dataParams = [...params, Math.min(limit, 100), offset];
        const [countResult, queryRes] = await Promise.all([
            this.pg.query(`SELECT COUNT(*) FROM strategic_plans WHERE ${whereClause}`, params),
            this.pg.query(`SELECT * FROM strategic_plans
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, dataParams),
        ]);
        const total = parseInt(countResult.rows[0].count, 10);
        const rows = queryRes?.rows || [];
        const plans = rows.map((row) => this.mapPlanRow(row));
        return { data: plans, total };
    }
    async batchByIds(ids, tenantId) {
        if (ids.length === 0)
            return [];
        const params = [ids];
        let query = `SELECT * FROM strategic_plans WHERE id = ANY($1)`;
        if (tenantId) {
            query += ` AND tenant_id = $2`;
            params.push(tenantId);
        }
        const queryRes = await this.pg.query(query, params);
        const rows = queryRes?.rows || [];
        const planMap = new Map(rows.map((row) => [row.id, this.mapPlanRow(row)]));
        return ids.map((id) => planMap.get(id) || null);
    }
    // ============================================================================
    // OBJECTIVES
    // ============================================================================
    async createObjective(input, userId) {
        const id = (0, crypto_1.randomUUID)();
        const queryRes = await this.pg.query(`INSERT INTO strategic_objectives (
        id, plan_id, name, description, status, target_value,
        current_value, unit, due_date, owner, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`, [
            id,
            input.planId,
            input.name,
            input.description,
            input.status || 'NOT_STARTED',
            input.targetValue,
            input.currentValue || 0,
            input.unit,
            input.dueDate,
            userId,
            input.metadata || {},
        ]);
        const rows = queryRes?.rows || [];
        return this.mapObjectiveRow(rows[0]);
    }
    async updateObjective(id, updates, userId) {
        const updateFields = [];
        const params = [id];
        let paramIndex = 2;
        const allowedFields = [
            'name', 'description', 'status', 'priority', 'target_value',
            'current_value', 'unit', 'start_date', 'target_date',
            'aligned_intelligence_priorities', 'success_criteria', 'dependencies',
        ];
        for (const field of allowedFields) {
            const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
            if (updates[camelField] !== undefined) {
                updateFields.push(`${field} = $${paramIndex}`);
                params.push(updates[camelField]);
                paramIndex++;
            }
        }
        if (updateFields.length === 0) {
            return this.findObjectiveById(id);
        }
        const { rows } = await this.pg.query(`UPDATE strategic_objectives SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`, params);
        if (!rows[0])
            return null;
        const objective = this.mapObjectiveRow(rows[0]);
        await this.recordActivity(objective.planId, 'objective', id, 'UPDATED', userId, { updates });
        return objective;
    }
    async findObjectiveById(id) {
        const { rows } = await this.pg.query(`SELECT * FROM strategic_objectives WHERE id = $1`, [id]);
        if (!rows[0])
            return null;
        const objective = this.mapObjectiveRow(rows[0]);
        // BOLT OPTIMIZATION: Parallelize child entity fetching to reduce database round-trip time.
        const [milestones, keyResults] = await Promise.all([
            this.getMilestones(id, 'objective'),
            this.getKeyResults(id),
        ]);
        objective.milestones = milestones;
        objective.keyResults = keyResults;
        return objective;
    }
    async getObjectivesByPlan(planId) {
        const { rows: objectiveRows } = await this.pg.query(`SELECT * FROM strategic_objectives WHERE plan_id = $1 ORDER BY created_at ASC`, [planId]);
        if (objectiveRows.length === 0)
            return [];
        const objectiveIds = objectiveRows.map((r) => r.id);
        // BOLT OPTIMIZATION: Fetch all milestones and key results in parallel for all objectives
        // Reduces database round-trips from 1+2N to 3 total queries and ensures full hydration.
        const [milestoneRes, keyResultRes] = await Promise.all([
            this.pg.query(`SELECT * FROM strategic_milestones WHERE parent_id = ANY($1) AND parent_type = 'objective' ORDER BY due_date ASC`, [objectiveIds]),
            this.pg.query(`SELECT * FROM strategic_key_results WHERE objective_id = ANY($1) ORDER BY due_date ASC`, [objectiveIds]),
        ]);
        const milestonesByObjective = new Map();
        (milestoneRes.rows || []).forEach((row) => {
            const list = milestonesByObjective.get(row.parent_id) || [];
            list.push(this.mapMilestoneRow(row));
            milestonesByObjective.set(row.parent_id, list);
        });
        const keyResultsByObjective = new Map();
        (keyResultRes.rows || []).forEach((row) => {
            const list = keyResultsByObjective.get(row.objective_id) || [];
            list.push(this.mapKeyResultRow(row));
            keyResultsByObjective.set(row.objective_id, list);
        });
        return objectiveRows.map((row) => {
            const objective = this.mapObjectiveRow(row);
            objective.milestones = milestonesByObjective.get(objective.id) || [];
            objective.keyResults = keyResultsByObjective.get(objective.id) || [];
            return objective;
        });
    }
    async deleteObjective(id, userId) {
        const queryRes = await this.pg.query(`DELETE FROM strategic_objectives WHERE id = $1 RETURNING plan_id`, [id]);
        const rows = queryRes?.rows || [];
        if (rows.length > 0) {
            await this.recordActivity(rows[0].plan_id, 'objective', id, 'DELETED', userId, {});
            return true;
        }
        return false;
    }
    // ============================================================================
    // KEY RESULTS
    // ============================================================================
    async createKeyResult(objectiveId, input) {
        const id = (0, crypto_1.randomUUID)();
        const queryRes = await this.pg.query(`INSERT INTO strategic_key_results (
        id, objective_id, description, target_value, unit, weight, due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`, [
            id,
            objectiveId,
            input.description,
            input.targetValue,
            input.unit,
            input.weight || 1.0,
            input.dueDate,
        ]);
        const rows = queryRes?.rows || [];
        return this.mapKeyResultRow(rows[0]);
    }
    async getKeyResults(objectiveId) {
        const queryRes = await this.pg.query(`SELECT * FROM strategic_key_results WHERE objective_id = $1 ORDER BY due_date ASC`, [objectiveId]);
        const rows = queryRes?.rows || [];
        return rows.map((row) => this.mapKeyResultRow(row));
    }
    async updateKeyResultProgress(id, currentValue, status) {
        const queryRes = await this.pg.query(`UPDATE strategic_key_results
       SET current_value = $2, status = COALESCE($3, status)
       WHERE id = $1
       RETURNING *`, [id, currentValue, status || null]);
        const rows = queryRes?.rows || [];
        return rows[0] ? this.mapKeyResultRow(rows[0]) : null;
    }
    // ============================================================================
    // INITIATIVES
    // ============================================================================
    async createInitiative(input, userId) {
        const id = (0, crypto_1.randomUUID)();
        const queryRes = await this.pg.query(`INSERT INTO strategic_initiatives (
        id, plan_id, objective_ids, name, description, type, priority,
        start_date, end_date, budget, assigned_to, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`, [
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
        ]);
        const rows = queryRes?.rows || [];
        await this.recordActivity(input.planId, 'initiative', id, 'CREATED', userId, { name: input.name });
        return this.mapInitiativeRow(rows[0]);
    }
    async updateInitiative(id, updates, userId) {
        const updateFields = [];
        const params = [id];
        let paramIndex = 2;
        const allowedFields = [
            'name', 'description', 'type', 'status', 'priority',
            'start_date', 'end_date', 'budget', 'budget_used',
            'assigned_to', 'risks', 'dependencies', 'objective_ids',
        ];
        for (const field of allowedFields) {
            const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
            if (updates[camelField] !== undefined) {
                updateFields.push(`${field} = $${paramIndex}`);
                params.push(updates[camelField]);
                paramIndex++;
            }
        }
        if (updateFields.length === 0) {
            return this.findInitiativeById(id);
        }
        const queryRes = await this.pg.query(`UPDATE strategic_initiatives SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`, params);
        const rows = queryRes?.rows || [];
        if (!rows[0])
            return null;
        const initiative = this.mapInitiativeRow(rows[0]);
        await this.recordActivity(initiative.planId, 'initiative', id, 'UPDATED', userId, { updates });
        return initiative;
    }
    async findInitiativeById(id) {
        const queryRes = await this.pg.query(`SELECT * FROM strategic_initiatives WHERE id = $1`, [id]);
        const rows = queryRes?.rows || [];
        if (!rows[0])
            return null;
        const initiative = this.mapInitiativeRow(rows[0]);
        // BOLT OPTIMIZATION: Parallelize child entity fetching to reduce database round-trip time.
        const [milestones, deliverables] = await Promise.all([
            this.getMilestones(id, 'initiative'),
            this.getDeliverables(id),
        ]);
        initiative.milestones = milestones;
        initiative.deliverables = deliverables;
        return initiative;
    }
    async getInitiativesByPlan(planId) {
        const { rows: initiativeRows } = await this.pg.query(`SELECT * FROM strategic_initiatives WHERE plan_id = $1 ORDER BY start_date ASC`, [planId]);
        if (initiativeRows.length === 0)
            return [];
        const initiativeIds = initiativeRows.map((r) => r.id);
        // BOLT OPTIMIZATION: Fetch all milestones and deliverables in parallel for all initiatives
        // Reduces database round-trips from 1+2N to 3 total queries
        const [milestoneRes, deliverableRes] = await Promise.all([
            this.pg.query(`SELECT * FROM strategic_milestones WHERE parent_id = ANY($1) AND parent_type = 'initiative' ORDER BY due_date ASC`, [initiativeIds]),
            this.pg.query(`SELECT * FROM strategic_deliverables WHERE initiative_id = ANY($1) ORDER BY due_date ASC`, [initiativeIds]),
        ]);
        const milestonesByInitiative = new Map();
        (milestoneRes.rows || []).forEach((row) => {
            const list = milestonesByInitiative.get(row.parent_id) || [];
            list.push(this.mapMilestoneRow(row));
            milestonesByInitiative.set(row.parent_id, list);
        });
        const deliverablesByInitiative = new Map();
        (deliverableRes.rows || []).forEach((row) => {
            const list = deliverablesByInitiative.get(row.initiative_id) || [];
            list.push(this.mapDeliverableRow(row));
            deliverablesByInitiative.set(row.initiative_id, list);
        });
        return initiativeRows.map((row) => {
            const initiative = this.mapInitiativeRow(row);
            initiative.milestones = milestonesByInitiative.get(initiative.id) || [];
            initiative.deliverables = deliverablesByInitiative.get(initiative.id) || [];
            return initiative;
        });
    }
    async deleteInitiative(id, userId) {
        const { rows } = await this.pg.query(`DELETE FROM strategic_initiatives WHERE id = $1 RETURNING plan_id`, [id]);
        if (rows.length > 0) {
            await this.recordActivity(rows[0].plan_id, 'initiative', id, 'DELETED', userId, {});
            return true;
        }
        return false;
    }
    // ============================================================================
    // DELIVERABLES
    // ============================================================================
    async createDeliverable(initiativeId, input) {
        const id = (0, crypto_1.randomUUID)();
        const { rows } = await this.pg.query(`INSERT INTO strategic_deliverables (id, initiative_id, name, description, type, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`, [id, initiativeId, input.name, input.description, input.type, input.dueDate]);
        return this.mapDeliverableRow(rows[0]);
    }
    async getDeliverables(initiativeId) {
        const { rows } = await this.pg.query(`SELECT * FROM strategic_deliverables WHERE initiative_id = $1 ORDER BY due_date ASC`, [initiativeId]);
        return rows.map((row) => this.mapDeliverableRow(row));
    }
    async updateDeliverableStatus(id, status, completedAt) {
        const { rows } = await this.pg.query(`UPDATE strategic_deliverables
       SET status = $2, completed_at = $3
       WHERE id = $1
       RETURNING *`, [id, status, completedAt || null]);
        return rows[0] ? this.mapDeliverableRow(rows[0]) : null;
    }
    // ============================================================================
    // MILESTONES
    // ============================================================================
    async createMilestone(input, userId) {
        const id = (0, crypto_1.randomUUID)();
        const { rows } = await this.pg.query(`INSERT INTO strategic_milestones (
        id, parent_id, parent_type, name, description, due_date, deliverables
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`, [
            id,
            input.parentId,
            input.parentType,
            input.name,
            input.description,
            input.dueDate,
            input.deliverables || [],
        ]);
        return this.mapMilestoneRow(rows[0]);
    }
    async getMilestones(parentId, parentType) {
        const { rows } = await this.pg.query(`SELECT * FROM strategic_milestones
       WHERE parent_id = $1 AND parent_type = $2
       ORDER BY due_date ASC`, [parentId, parentType]);
        return rows.map((row) => this.mapMilestoneRow(row));
    }
    async updateMilestoneStatus(id, status, userId, completedAt) {
        const { rows } = await this.pg.query(`UPDATE strategic_milestones
       SET status = $2, completed_at = $3, completed_by = $4
       WHERE id = $1
       RETURNING *`, [id, status, status === 'COMPLETED' ? completedAt || new Date() : null, status === 'COMPLETED' ? userId : null]);
        return rows[0] ? this.mapMilestoneRow(rows[0]) : null;
    }
    // ============================================================================
    // RISKS
    // ============================================================================
    async createRisk(input, userId) {
        const id = (0, crypto_1.randomUUID)();
        const riskScore = input.likelihood * input.impact;
        const riskLevel = this.calculateRiskLevel(riskScore);
        const { rows } = await this.pg.query(`INSERT INTO strategic_risks (
        id, plan_id, name, description, category, likelihood, impact,
        risk_level, contingency_plans, owner, review_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`, [
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
        ]);
        await this.recordActivity(input.planId, 'risk', id, 'CREATED', userId, { name: input.name, riskLevel });
        return this.mapRiskRow(rows[0]);
    }
    async updateRisk(id, updates, userId) {
        const updateFields = [];
        const params = [id];
        let paramIndex = 2;
        const allowedFields = [
            'name', 'description', 'category', 'likelihood', 'impact',
            'status', 'contingency_plans', 'owner', 'review_date',
        ];
        for (const field of allowedFields) {
            const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
            if (updates[camelField] !== undefined) {
                updateFields.push(`${field} = $${paramIndex}`);
                params.push(updates[camelField]);
                paramIndex++;
            }
        }
        if (updates.likelihood !== undefined || updates.impact !== undefined) {
            const { rows: current } = await this.pg.query(`SELECT likelihood, impact FROM strategic_risks WHERE id = $1`, [id]);
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
            const { rows } = await this.pg.query(`SELECT * FROM strategic_risks WHERE id = $1`, [id]);
            return rows[0] ? this.mapRiskRow(rows[0]) : null;
        }
        const { rows } = await this.pg.query(`UPDATE strategic_risks SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`, params);
        if (!rows[0])
            return null;
        const risk = this.mapRiskRow(rows[0]);
        await this.recordActivity(risk.planId, 'risk', id, 'UPDATED', userId, { updates });
        return risk;
    }
    async getRisksByPlan(planId) {
        const { rows: riskRows } = await this.pg.query(`SELECT * FROM strategic_risks WHERE plan_id = $1 ORDER BY risk_score DESC`, [planId]);
        if (riskRows.length === 0)
            return [];
        const riskIds = riskRows.map((r) => r.id);
        // BOLT OPTIMIZATION: Fetch all mitigation strategies in a single query for all risks
        // Reduces database round-trips from 1+N to 2 total queries
        const { rows: mitigationRows } = await this.pg.query(`SELECT * FROM strategic_mitigations WHERE risk_id = ANY($1) ORDER BY deadline ASC`, [riskIds]);
        const mitigationsByRisk = new Map();
        (mitigationRows || []).forEach((row) => {
            const list = mitigationsByRisk.get(row.risk_id) || [];
            list.push(this.mapMitigationRow(row));
            mitigationsByRisk.set(row.risk_id, list);
        });
        return riskRows.map((row) => {
            const risk = this.mapRiskRow(row);
            risk.mitigationStrategies = mitigationsByRisk.get(risk.id) || [];
            return risk;
        });
    }
    async createMitigationStrategy(riskId, input) {
        const id = (0, crypto_1.randomUUID)();
        const { rows } = await this.pg.query(`INSERT INTO strategic_mitigations (id, risk_id, description, type, owner, deadline, cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`, [id, riskId, input.description, input.type, input.owner, input.deadline, input.cost || null]);
        return this.mapMitigationRow(rows[0]);
    }
    async getMitigationStrategies(riskId) {
        const { rows } = await this.pg.query(`SELECT * FROM strategic_mitigations WHERE risk_id = $1 ORDER BY deadline ASC`, [riskId]);
        return rows.map((row) => this.mapMitigationRow(row));
    }
    // ============================================================================
    // STAKEHOLDERS
    // ============================================================================
    async addStakeholder(input, addedBy) {
        const id = (0, crypto_1.randomUUID)();
        const { rows } = await this.pg.query(`INSERT INTO strategic_stakeholders (
        id, plan_id, user_id, name, role, responsibilities, added_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (plan_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        responsibilities = EXCLUDED.responsibilities
      RETURNING *`, [
            id,
            input.planId,
            input.userId,
            input.name,
            input.role,
            input.responsibilities || [],
            addedBy,
        ]);
        return this.mapStakeholderRow(rows[0]);
    }
    async getStakeholdersByPlan(planId) {
        const { rows } = await this.pg.query(`SELECT * FROM strategic_stakeholders WHERE plan_id = $1 ORDER BY role ASC`, [planId]);
        return rows.map((row) => this.mapStakeholderRow(row));
    }
    async removeStakeholder(planId, userId) {
        const { rowCount } = await this.pg.query(`DELETE FROM strategic_stakeholders WHERE plan_id = $1 AND user_id = $2`, [planId, userId]);
        return (rowCount ?? 0) > 0;
    }
    // ============================================================================
    // RESOURCES
    // ============================================================================
    async allocateResource(input) {
        const id = (0, crypto_1.randomUUID)();
        const { rows } = await this.pg.query(`INSERT INTO strategic_resources (
        id, plan_id, type, name, description, allocated, unit, start_date, end_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`, [
            id,
            input.planId,
            input.type,
            input.name,
            input.description,
            input.allocated,
            input.unit,
            input.startDate,
            input.endDate,
        ]);
        return this.mapResourceRow(rows[0]);
    }
    async getResourcesByPlan(planId) {
        const { rows } = await this.pg.query(`SELECT * FROM strategic_resources WHERE plan_id = $1 ORDER BY type ASC`, [planId]);
        return rows.map((row) => this.mapResourceRow(row));
    }
    async updateResourceUsage(id, used, status) {
        const { rows } = await this.pg.query(`UPDATE strategic_resources
       SET used = $2, status = COALESCE($3, status)
       WHERE id = $1
       RETURNING *`, [id, used, status || null]);
        return rows[0] ? this.mapResourceRow(rows[0]) : null;
    }
    // ============================================================================
    // KPIs
    // ============================================================================
    async createKPI(input) {
        const id = (0, crypto_1.randomUUID)();
        const { rows } = await this.pg.query(`INSERT INTO strategic_kpis (
        id, plan_id, name, description, formula, target_value, unit, frequency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`, [
            id,
            input.planId,
            input.name,
            input.description,
            input.formula,
            input.targetValue,
            input.unit,
            input.frequency,
        ]);
        return this.mapKPIRow(rows[0]);
    }
    async getKPIsByPlan(planId) {
        const { rows } = await this.pg.query(`SELECT * FROM strategic_kpis WHERE plan_id = $1 ORDER BY name ASC`, [planId]);
        return rows.map((row) => this.mapKPIRow(row));
    }
    async updateKPIValue(id, currentValue, notes) {
        const { rows: current } = await this.pg.query(`SELECT current_value, history FROM strategic_kpis WHERE id = $1`, [id]);
        if (!current[0])
            return null;
        const previousValue = current[0].current_value;
        const history = current[0].history || [];
        history.push({
            timestamp: new Date().toISOString(),
            value: currentValue,
            notes,
        });
        let trend = 'STABLE';
        if (currentValue > previousValue)
            trend = 'UP';
        else if (currentValue < previousValue)
            trend = 'DOWN';
        const { rows } = await this.pg.query(`UPDATE strategic_kpis
       SET current_value = $2, trend = $3, history = $4, last_updated = now()
       WHERE id = $1
       RETURNING *`, [id, currentValue, trend, JSON.stringify(history)]);
        return rows[0] ? this.mapKPIRow(rows[0]) : null;
    }
    // ============================================================================
    // ACTIVITY LOG
    // ============================================================================
    async recordActivity(planId, entityType, entityId, action, actorId, changes) {
        await this.pg.query(`INSERT INTO strategic_plan_activities (plan_id, entity_type, entity_id, action, actor_id, changes)
       VALUES ($1, $2, $3, $4, $5, $6)`, [planId, entityType, entityId, action, actorId, JSON.stringify(changes)]);
    }
    async getActivityLog(planId, limit = 50) {
        const { rows } = await this.pg.query(`SELECT * FROM strategic_plan_activities
       WHERE plan_id = $1
       ORDER BY created_at DESC
       LIMIT $2`, [planId, limit]);
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
    async loadPlanRelations(plan) {
        const [objectives, initiatives, risks, stakeholders, resources, kpis] = await Promise.all([
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
    calculateRiskLevel(score) {
        if (score >= 20)
            return 'CRITICAL';
        if (score >= 12)
            return 'HIGH';
        if (score >= 6)
            return 'MEDIUM';
        return 'LOW';
    }
    // ============================================================================
    // ROW MAPPERS
    // ============================================================================
    mapPlanRow(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            investigationId: row.investigation_id || undefined,
            name: row.name,
            description: row.description,
            status: row.status,
            priority: row.priority,
            timeHorizon: row.time_horizon,
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
    mapObjectiveRow(row) {
        return {
            id: row.id,
            planId: row.plan_id,
            name: row.name,
            description: row.description,
            status: row.status,
            priority: row.priority,
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
    mapKeyResultRow(row) {
        return {
            id: row.id,
            objectiveId: row.objective_id,
            description: row.description,
            targetValue: Number(row.target_value),
            currentValue: Number(row.current_value),
            unit: row.unit,
            weight: Number(row.weight),
            status: row.status,
            dueDate: row.due_date,
            updatedAt: row.updated_at,
        };
    }
    mapInitiativeRow(row) {
        return {
            id: row.id,
            planId: row.plan_id,
            objectiveIds: row.objective_ids,
            name: row.name,
            description: row.description,
            type: row.type,
            status: row.status,
            priority: row.priority,
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
    mapDeliverableRow(row) {
        return {
            id: row.id,
            initiativeId: row.initiative_id,
            name: row.name,
            description: row.description,
            type: row.type,
            status: row.status,
            dueDate: row.due_date,
            completedAt: row.completed_at || undefined,
            artifacts: row.artifacts,
        };
    }
    mapMilestoneRow(row) {
        return {
            id: row.id,
            parentId: row.parent_id,
            parentType: row.parent_type,
            name: row.name,
            description: row.description,
            status: row.status,
            dueDate: row.due_date,
            completedAt: row.completed_at || undefined,
            completedBy: row.completed_by || undefined,
            deliverables: row.deliverables,
            dependencies: row.dependencies,
        };
    }
    mapRiskRow(row) {
        return {
            id: row.id,
            planId: row.plan_id,
            name: row.name,
            description: row.description,
            category: row.category,
            likelihood: row.likelihood,
            impact: row.impact,
            riskScore: row.risk_score,
            riskLevel: row.risk_level,
            status: row.status,
            mitigationStrategies: [],
            contingencyPlans: row.contingency_plans,
            owner: row.owner,
            identifiedAt: row.identified_at,
            lastAssessedAt: row.last_assessed_at,
            reviewDate: row.review_date,
        };
    }
    mapMitigationRow(row) {
        return {
            id: row.id,
            riskId: row.risk_id,
            description: row.description,
            type: row.type,
            status: row.status,
            effectiveness: Number(row.effectiveness),
            cost: row.cost ? Number(row.cost) : undefined,
            owner: row.owner,
            deadline: row.deadline,
        };
    }
    mapStakeholderRow(row) {
        return {
            id: row.id,
            planId: row.plan_id,
            userId: row.user_id,
            name: row.name,
            role: row.role,
            responsibilities: row.responsibilities,
            communicationPreferences: row.communication_preferences,
            addedAt: row.added_at,
            addedBy: row.added_by,
        };
    }
    mapResourceRow(row) {
        return {
            id: row.id,
            planId: row.plan_id,
            type: row.type,
            name: row.name,
            description: row.description,
            allocated: Number(row.allocated),
            used: Number(row.used),
            unit: row.unit,
            startDate: row.start_date,
            endDate: row.end_date,
            status: row.status,
        };
    }
    mapKPIRow(row) {
        return {
            id: row.id,
            planId: row.plan_id,
            name: row.name,
            description: row.description,
            formula: row.formula,
            targetValue: Number(row.target_value),
            currentValue: Number(row.current_value),
            unit: row.unit,
            frequency: row.frequency,
            trend: row.trend,
            lastUpdated: row.last_updated,
            history: row.history || [],
        };
    }
}
exports.StrategicPlanRepo = StrategicPlanRepo;
