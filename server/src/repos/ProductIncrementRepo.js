"use strict";
// @ts-nocheck
/**
 * Product Increment Repository - Production persistence layer
 * Handles product increment/sprint management with PostgreSQL
 *
 * Provides CRUD operations and advanced queries for:
 * - Product Increments (sprints/iterations)
 * - Increment Goals (objectives)
 * - Deliverables (work items)
 * - Team Assignments
 * - Metrics Snapshots
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductIncrementRepo = void 0;
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const ledger_js_1 = require("../provenance/ledger.js");
const repoLogger = logger_js_1.default.child({ name: 'ProductIncrementRepo' });
// =============================================================================
// REPOSITORY CLASS
// =============================================================================
class ProductIncrementRepo {
    pg;
    constructor(pg) {
        this.pg = pg;
    }
    // ===========================================================================
    // PRODUCT INCREMENT CRUD
    // ===========================================================================
    /**
     * Create new product increment
     */
    async createIncrement(input, userId) {
        const id = (0, crypto_1.randomUUID)();
        const { rows } = (await this.pg.query(`INSERT INTO product_increments (
        id, tenant_id, name, description, version, status,
        planned_start_date, planned_end_date, planned_capacity_points,
        release_notes, release_tag, release_url, props, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`, [
            id,
            input.tenantId,
            input.name,
            input.description || null,
            input.version,
            input.status || 'planning',
            input.plannedStartDate || null,
            input.plannedEndDate || null,
            input.plannedCapacityPoints || 0,
            input.releaseNotes || null,
            input.releaseTag || null,
            input.releaseUrl || null,
            JSON.stringify(input.props || {}),
            userId,
        ]));
        const increment = this.mapIncrementRow(rows[0]);
        ledger_js_1.provenanceLedger
            .appendEntry({
            tenantId: input.tenantId,
            actionType: 'INCREMENT_CREATED',
            resourceType: 'product_increment',
            resourceId: increment.id,
            actorId: userId,
            actorType: 'user',
            payload: { name: input.name, version: input.version },
            metadata: {},
        })
            .catch((err) => repoLogger.error('Failed to record increment creation', err instanceof Error ? err.message : String(err)));
        return increment;
    }
    /**
     * Update product increment
     */
    async updateIncrement(id, input, userId) {
        const updateFields = [];
        const params = [id];
        let paramIndex = 2;
        const fieldMappings = {
            name: 'name',
            description: 'description',
            version: 'version',
            status: 'status',
            plannedStartDate: 'planned_start_date',
            plannedEndDate: 'planned_end_date',
            actualStartDate: 'actual_start_date',
            actualEndDate: 'actual_end_date',
            plannedCapacityPoints: 'planned_capacity_points',
            releaseNotes: 'release_notes',
            releaseTag: 'release_tag',
            releaseUrl: 'release_url',
        };
        for (const [key, dbField] of Object.entries(fieldMappings)) {
            if (input[key] !== undefined) {
                updateFields.push(`${dbField} = $${paramIndex}`);
                params.push(input[key]);
                paramIndex++;
            }
        }
        if (input.props !== undefined) {
            updateFields.push(`props = $${paramIndex}`);
            params.push(JSON.stringify(input.props));
            paramIndex++;
        }
        if (updateFields.length === 0) {
            return await this.findIncrementById(id);
        }
        updateFields.push(`updated_at = now()`);
        updateFields.push(`updated_by = $${paramIndex}`);
        params.push(userId);
        const { rows } = (await this.pg.query(`UPDATE product_increments SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`, params));
        if (rows[0]) {
            const increment = this.mapIncrementRow(rows[0]);
            ledger_js_1.provenanceLedger
                .appendEntry({
                tenantId: increment.tenantId,
                actionType: 'INCREMENT_UPDATED',
                resourceType: 'product_increment',
                resourceId: increment.id,
                actorId: userId,
                actorType: 'user',
                payload: { updates: input },
                metadata: {},
            })
                .catch((err) => repoLogger.error('Failed to record increment update', err instanceof Error ? err.message : String(err)));
            return increment;
        }
        return null;
    }
    /**
     * Delete product increment
     */
    async deleteIncrement(id, userId) {
        const client = await this.pg.connect();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query(`DELETE FROM product_increments WHERE id = $1 RETURNING tenant_id`, [id]);
            await client.query('COMMIT');
            if (rows.length > 0) {
                ledger_js_1.provenanceLedger
                    .appendEntry({
                    tenantId: rows[0].tenant_id,
                    actionType: 'INCREMENT_DELETED',
                    resourceType: 'product_increment',
                    resourceId: id,
                    actorId: userId,
                    actorType: 'user',
                    payload: {},
                    metadata: {},
                })
                    .catch((err) => repoLogger.error('Failed to record increment deletion', err instanceof Error ? err.message : String(err)));
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
    /**
     * Find increment by ID
     */
    async findIncrementById(id, tenantId) {
        const params = [id];
        let query = `SELECT * FROM product_increments WHERE id = $1`;
        if (tenantId) {
            query += ` AND tenant_id = $2`;
            params.push(tenantId);
        }
        const { rows } = (await this.pg.query(query, params));
        return rows[0] ? this.mapIncrementRow(rows[0]) : null;
    }
    /**
     * List increments with filters
     */
    async listIncrements({ tenantId, filter, limit = 50, offset = 0, }) {
        const params = [tenantId];
        const conditions = ['tenant_id = $1'];
        let paramIndex = 2;
        if (filter?.status) {
            if (Array.isArray(filter.status)) {
                conditions.push(`status = ANY($${paramIndex})`);
                params.push(filter.status);
            }
            else {
                conditions.push(`status = $${paramIndex}`);
                params.push(filter.status);
            }
            paramIndex++;
        }
        if (filter?.search) {
            conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
            params.push(`%${filter.search}%`);
            paramIndex++;
        }
        if (filter?.startDateFrom) {
            conditions.push(`planned_start_date >= $${paramIndex}`);
            params.push(filter.startDateFrom);
            paramIndex++;
        }
        if (filter?.startDateTo) {
            conditions.push(`planned_start_date <= $${paramIndex}`);
            params.push(filter.startDateTo);
            paramIndex++;
        }
        const query = `
      SELECT * FROM product_increments
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        params.push(Math.min(limit, 1000), offset);
        const { rows } = (await this.pg.query(query, params));
        return rows.map(this.mapIncrementRow);
    }
    /**
     * Get increment summary with computed metrics
     */
    async getIncrementSummary(id, tenantId) {
        const params = [id];
        let query = `SELECT * FROM v_increment_summary WHERE id = $1`;
        if (tenantId) {
            query += ` AND tenant_id = $2`;
            params.push(tenantId);
        }
        const { rows } = (await this.pg.query(query, params));
        if (!rows[0])
            return null;
        const row = rows[0];
        return {
            ...this.mapIncrementRow(row),
            totalGoals: parseInt(String(row.total_goals)) || 0,
            completedGoals: parseInt(String(row.completed_goals)) || 0,
            totalDeliverables: parseInt(String(row.total_deliverables)) || 0,
            completedDeliverables: parseInt(String(row.completed_deliverables)) || 0,
            inProgressDeliverables: parseInt(String(row.in_progress_deliverables)) || 0,
            blockedDeliverables: parseInt(String(row.blocked_deliverables)) || 0,
            teamSize: parseInt(String(row.team_size)) || 0,
        };
    }
    /**
     * Get current/active increment for tenant
     */
    async getCurrentIncrement(tenantId) {
        const { rows } = (await this.pg.query(`SELECT * FROM product_increments
       WHERE tenant_id = $1 AND status = 'active'
       ORDER BY planned_start_date DESC
       LIMIT 1`, [tenantId]));
        return rows[0] ? this.mapIncrementRow(rows[0]) : null;
    }
    // ===========================================================================
    // GOAL CRUD
    // ===========================================================================
    /**
     * Create increment goal
     */
    async createGoal(input, userId) {
        const id = (0, crypto_1.randomUUID)();
        const { rows } = (await this.pg.query(`INSERT INTO increment_goals (
        id, increment_id, tenant_id, title, description, category,
        priority, story_points, acceptance_criteria, success_metrics, props, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`, [
            id,
            input.incrementId,
            input.tenantId,
            input.title,
            input.description || null,
            input.category || 'feature',
            input.priority || 'medium',
            input.storyPoints || null,
            JSON.stringify(input.acceptanceCriteria || []),
            JSON.stringify(input.successMetrics || {}),
            JSON.stringify(input.props || {}),
            userId,
        ]));
        return this.mapGoalRow(rows[0]);
    }
    /**
     * Update increment goal
     */
    async updateGoal(id, input) {
        const updateFields = [];
        const params = [id];
        let paramIndex = 2;
        const fieldMappings = {
            title: 'title',
            description: 'description',
            category: 'category',
            priority: 'priority',
            storyPoints: 'story_points',
            status: 'status',
            completedAt: 'completed_at',
            completionNotes: 'completion_notes',
        };
        for (const [key, dbField] of Object.entries(fieldMappings)) {
            if (input[key] !== undefined) {
                updateFields.push(`${dbField} = $${paramIndex}`);
                params.push(input[key]);
                paramIndex++;
            }
        }
        if (input.acceptanceCriteria !== undefined) {
            updateFields.push(`acceptance_criteria = $${paramIndex}`);
            params.push(JSON.stringify(input.acceptanceCriteria));
            paramIndex++;
        }
        if (input.successMetrics !== undefined) {
            updateFields.push(`success_metrics = $${paramIndex}`);
            params.push(JSON.stringify(input.successMetrics));
            paramIndex++;
        }
        if (input.props !== undefined) {
            updateFields.push(`props = $${paramIndex}`);
            params.push(JSON.stringify(input.props));
            paramIndex++;
        }
        if (updateFields.length === 0) {
            return await this.findGoalById(id);
        }
        updateFields.push(`updated_at = now()`);
        const { rows } = (await this.pg.query(`UPDATE increment_goals SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`, params));
        return rows[0] ? this.mapGoalRow(rows[0]) : null;
    }
    /**
     * Delete increment goal
     */
    async deleteGoal(id) {
        const { rowCount } = await this.pg.query(`DELETE FROM increment_goals WHERE id = $1`, [id]);
        return (rowCount ?? 0) > 0;
    }
    /**
     * Find goal by ID
     */
    async findGoalById(id) {
        const { rows } = (await this.pg.query(`SELECT * FROM increment_goals WHERE id = $1`, [id]));
        return rows[0] ? this.mapGoalRow(rows[0]) : null;
    }
    /**
     * List goals for increment
     */
    async listGoals(incrementId) {
        const { rows } = (await this.pg.query(`SELECT * FROM increment_goals
       WHERE increment_id = $1
       ORDER BY priority DESC, created_at ASC`, [incrementId]));
        return rows.map(this.mapGoalRow);
    }
    // ===========================================================================
    // DELIVERABLE CRUD
    // ===========================================================================
    /**
     * Create deliverable
     */
    async createDeliverable(input, userId) {
        const id = (0, crypto_1.randomUUID)();
        const { rows } = (await this.pg.query(`INSERT INTO increment_deliverables (
        id, increment_id, goal_id, tenant_id, title, description,
        deliverable_type, parent_id, priority, story_points,
        assignee_id, assignee_name, external_id, external_url,
        investigation_id, props, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`, [
            id,
            input.incrementId,
            input.goalId || null,
            input.tenantId,
            input.title,
            input.description || null,
            input.deliverableType || 'task',
            input.parentId || null,
            input.priority || 'medium',
            input.storyPoints || null,
            input.assigneeId || null,
            input.assigneeName || null,
            input.externalId || null,
            input.externalUrl || null,
            input.investigationId || null,
            JSON.stringify(input.props || {}),
            userId,
        ]));
        return this.mapDeliverableRow(rows[0]);
    }
    /**
     * Update deliverable
     */
    async updateDeliverable(id, input) {
        const updateFields = [];
        const params = [id];
        let paramIndex = 2;
        const fieldMappings = {
            title: 'title',
            description: 'description',
            goalId: 'goal_id',
            deliverableType: 'deliverable_type',
            parentId: 'parent_id',
            priority: 'priority',
            storyPoints: 'story_points',
            status: 'status',
            assigneeId: 'assignee_id',
            assigneeName: 'assignee_name',
            externalId: 'external_id',
            externalUrl: 'external_url',
            progressPercent: 'progress_percent',
            startedAt: 'started_at',
            completedAt: 'completed_at',
            investigationId: 'investigation_id',
        };
        for (const [key, dbField] of Object.entries(fieldMappings)) {
            if (input[key] !== undefined) {
                updateFields.push(`${dbField} = $${paramIndex}`);
                params.push(input[key]);
                paramIndex++;
            }
        }
        if (input.props !== undefined) {
            updateFields.push(`props = $${paramIndex}`);
            params.push(JSON.stringify(input.props));
            paramIndex++;
        }
        if (updateFields.length === 0) {
            return await this.findDeliverableById(id);
        }
        updateFields.push(`updated_at = now()`);
        const { rows } = (await this.pg.query(`UPDATE increment_deliverables SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`, params));
        return rows[0] ? this.mapDeliverableRow(rows[0]) : null;
    }
    /**
     * Delete deliverable
     */
    async deleteDeliverable(id) {
        const { rowCount } = await this.pg.query(`DELETE FROM increment_deliverables WHERE id = $1`, [id]);
        return (rowCount ?? 0) > 0;
    }
    /**
     * Find deliverable by ID
     */
    async findDeliverableById(id) {
        const { rows } = (await this.pg.query(`SELECT * FROM increment_deliverables WHERE id = $1`, [id]));
        return rows[0] ? this.mapDeliverableRow(rows[0]) : null;
    }
    /**
     * List deliverables for increment
     */
    async listDeliverables(incrementId, options) {
        const params = [incrementId];
        const conditions = ['increment_id = $1'];
        let paramIndex = 2;
        if (options?.status) {
            if (Array.isArray(options.status)) {
                conditions.push(`status = ANY($${paramIndex})`);
                params.push(options.status);
            }
            else {
                conditions.push(`status = $${paramIndex}`);
                params.push(options.status);
            }
            paramIndex++;
        }
        if (options?.assigneeId) {
            conditions.push(`assignee_id = $${paramIndex}`);
            params.push(options.assigneeId);
            paramIndex++;
        }
        if (options?.goalId) {
            conditions.push(`goal_id = $${paramIndex}`);
            params.push(options.goalId);
            paramIndex++;
        }
        const { rows } = (await this.pg.query(`SELECT * FROM increment_deliverables
       WHERE ${conditions.join(' AND ')}
       ORDER BY priority DESC, created_at ASC`, params));
        return rows.map(this.mapDeliverableRow);
    }
    // ===========================================================================
    // TEAM ASSIGNMENT CRUD
    // ===========================================================================
    /**
     * Assign team member to increment
     */
    async assignTeamMember(input) {
        const id = (0, crypto_1.randomUUID)();
        const { rows } = (await this.pg.query(`INSERT INTO increment_team_assignments (
        id, increment_id, tenant_id, user_id, user_name, user_email,
        role, allocation_percent, props
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (increment_id, user_id) DO UPDATE SET
        user_name = EXCLUDED.user_name,
        user_email = EXCLUDED.user_email,
        role = EXCLUDED.role,
        allocation_percent = EXCLUDED.allocation_percent,
        props = EXCLUDED.props
      RETURNING *`, [
            id,
            input.incrementId,
            input.tenantId,
            input.userId,
            input.userName || null,
            input.userEmail || null,
            input.role || 'contributor',
            input.allocationPercent || 100,
            JSON.stringify(input.props || {}),
        ]));
        return this.mapTeamAssignmentRow(rows[0]);
    }
    /**
     * Remove team member from increment
     */
    async removeTeamMember(incrementId, userId) {
        const { rowCount } = await this.pg.query(`DELETE FROM increment_team_assignments
       WHERE increment_id = $1 AND user_id = $2`, [incrementId, userId]);
        return (rowCount ?? 0) > 0;
    }
    /**
     * List team members for increment
     */
    async listTeamMembers(incrementId) {
        const { rows } = (await this.pg.query(`SELECT * FROM increment_team_assignments
       WHERE increment_id = $1
       ORDER BY role, user_name`, [incrementId]));
        return rows.map(this.mapTeamAssignmentRow);
    }
    // ===========================================================================
    // METRICS SNAPSHOTS
    // ===========================================================================
    /**
     * Record metrics snapshot for an increment
     */
    async recordMetricsSnapshot(incrementId) {
        const increment = await this.getIncrementSummary(incrementId);
        if (!increment) {
            throw new Error(`Increment ${incrementId} not found`);
        }
        const { rows } = (await this.pg.query(`INSERT INTO increment_metrics_snapshots (
        id, increment_id, tenant_id, snapshot_date,
        total_points, completed_points, remaining_points,
        total_items, completed_items, in_progress_items, blocked_items,
        goals_total, goals_completed, metrics
      )
      VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (increment_id, snapshot_date) DO UPDATE SET
        total_points = EXCLUDED.total_points,
        completed_points = EXCLUDED.completed_points,
        remaining_points = EXCLUDED.remaining_points,
        total_items = EXCLUDED.total_items,
        completed_items = EXCLUDED.completed_items,
        in_progress_items = EXCLUDED.in_progress_items,
        blocked_items = EXCLUDED.blocked_items,
        goals_total = EXCLUDED.goals_total,
        goals_completed = EXCLUDED.goals_completed,
        metrics = EXCLUDED.metrics
      RETURNING *`, [
            (0, crypto_1.randomUUID)(),
            incrementId,
            increment.tenantId,
            increment.committedPoints,
            increment.completedPoints,
            increment.committedPoints - increment.completedPoints,
            increment.totalDeliverables,
            increment.completedDeliverables,
            increment.inProgressDeliverables,
            increment.blockedDeliverables,
            increment.totalGoals,
            increment.completedGoals,
            JSON.stringify({
                velocity: increment.velocity,
                plannedCapacity: increment.plannedCapacityPoints,
            }),
        ]));
        return this.mapMetricsSnapshotRow(rows[0]);
    }
    /**
     * Get metrics history (burndown data)
     */
    async getMetricsHistory(incrementId, startDate, endDate) {
        const params = [incrementId];
        let query = `SELECT * FROM increment_metrics_snapshots WHERE increment_id = $1`;
        let paramIndex = 2;
        if (startDate) {
            query += ` AND snapshot_date >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }
        if (endDate) {
            query += ` AND snapshot_date <= $${paramIndex}`;
            params.push(endDate);
        }
        query += ` ORDER BY snapshot_date ASC`;
        const { rows } = (await this.pg.query(query, params));
        return rows.map(this.mapMetricsSnapshotRow);
    }
    // ===========================================================================
    // BATCH OPERATIONS
    // ===========================================================================
    /**
     * Batch load increments by IDs (for DataLoader)
     */
    async batchByIds(ids, tenantId) {
        if (ids.length === 0)
            return [];
        const params = [ids];
        let query = `SELECT * FROM product_increments WHERE id = ANY($1)`;
        if (tenantId) {
            query += ` AND tenant_id = $2`;
            params.push(tenantId);
        }
        const { rows } = (await this.pg.query(query, params));
        const incrementsMap = new Map(rows.map((row) => [row.id, this.mapIncrementRow(row)]));
        return ids.map((id) => incrementsMap.get(id) || null);
    }
    // ===========================================================================
    // ROW MAPPERS
    // ===========================================================================
    mapIncrementRow(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            description: row.description || undefined,
            version: row.version,
            status: row.status,
            plannedStartDate: row.planned_start_date || undefined,
            plannedEndDate: row.planned_end_date || undefined,
            actualStartDate: row.actual_start_date || undefined,
            actualEndDate: row.actual_end_date || undefined,
            plannedCapacityPoints: row.planned_capacity_points,
            committedPoints: row.committed_points,
            completedPoints: row.completed_points,
            velocity: row.velocity || undefined,
            releaseNotes: row.release_notes || undefined,
            releaseTag: row.release_tag || undefined,
            releaseUrl: row.release_url || undefined,
            props: row.props,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
            updatedBy: row.updated_by || undefined,
        };
    }
    mapGoalRow(row) {
        return {
            id: row.id,
            incrementId: row.increment_id,
            tenantId: row.tenant_id,
            title: row.title,
            description: row.description || undefined,
            category: row.category,
            priority: row.priority,
            storyPoints: row.story_points || undefined,
            status: row.status,
            acceptanceCriteria: row.acceptance_criteria,
            successMetrics: row.success_metrics,
            completedAt: row.completed_at || undefined,
            completionNotes: row.completion_notes || undefined,
            props: row.props,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
        };
    }
    mapDeliverableRow(row) {
        return {
            id: row.id,
            incrementId: row.increment_id,
            goalId: row.goal_id || undefined,
            tenantId: row.tenant_id,
            title: row.title,
            description: row.description || undefined,
            deliverableType: row.deliverable_type,
            parentId: row.parent_id || undefined,
            priority: row.priority,
            storyPoints: row.story_points || undefined,
            status: row.status,
            assigneeId: row.assignee_id || undefined,
            assigneeName: row.assignee_name || undefined,
            externalId: row.external_id || undefined,
            externalUrl: row.external_url || undefined,
            progressPercent: row.progress_percent,
            startedAt: row.started_at || undefined,
            completedAt: row.completed_at || undefined,
            investigationId: row.investigation_id || undefined,
            props: row.props,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
        };
    }
    mapTeamAssignmentRow(row) {
        return {
            id: row.id,
            incrementId: row.increment_id,
            tenantId: row.tenant_id,
            userId: row.user_id,
            userName: row.user_name || undefined,
            userEmail: row.user_email || undefined,
            role: row.role,
            allocationPercent: row.allocation_percent,
            props: row.props,
            createdAt: row.created_at,
        };
    }
    mapMetricsSnapshotRow(row) {
        return {
            id: row.id,
            incrementId: row.increment_id,
            tenantId: row.tenant_id,
            snapshotDate: row.snapshot_date,
            totalPoints: row.total_points,
            completedPoints: row.completed_points,
            remainingPoints: row.remaining_points,
            totalItems: row.total_items,
            completedItems: row.completed_items,
            inProgressItems: row.in_progress_items,
            blockedItems: row.blocked_items,
            goalsTotal: row.goals_total,
            goalsCompleted: row.goals_completed,
            metrics: row.metrics,
            createdAt: row.created_at,
        };
    }
}
exports.ProductIncrementRepo = ProductIncrementRepo;
