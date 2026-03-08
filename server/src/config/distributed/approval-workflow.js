"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalWorkflowManager = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
/**
 * Configuration Change Approval Workflow
 *
 * Features:
 * - Multi-approver support
 * - Environment-based auto-approval
 * - Approval tracking and audit
 * - Rejection with reasons
 * - Workflow cancellation
 */
class ApprovalWorkflowManager {
    pool;
    events = new events_1.EventEmitter();
    defaultApprovers;
    defaultRequiredApprovals;
    autoApproveEnvironments;
    constructor(config) {
        this.pool = config.pool;
        this.defaultApprovers = config.defaultApprovers || [];
        this.defaultRequiredApprovals = config.defaultRequiredApprovals || 1;
        this.autoApproveEnvironments = new Set(config.autoApproveEnvironments || ['development']);
    }
    /**
     * Initialize database schema
     */
    async initialize() {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Approval workflows table
            await client.query(`
        CREATE TABLE IF NOT EXISTS approval_workflows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          change_id VARCHAR(255) UNIQUE NOT NULL,
          config_id VARCHAR(255) NOT NULL,
          proposed_version JSONB NOT NULL,
          requested_by VARCHAR(255) NOT NULL,
          requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
          approvers TEXT[] NOT NULL,
          approvals JSONB DEFAULT '[]'::jsonb,
          rejections JSONB DEFAULT '[]'::jsonb,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          auto_approve_for TEXT[],
          required_approvals INTEGER NOT NULL DEFAULT 1,
          environment VARCHAR(50),
          reason TEXT,
          applied_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
            // Approval rules table (for configuring per-config approval policies)
            await client.query(`
        CREATE TABLE IF NOT EXISTS approval_rules (
          config_id VARCHAR(255) PRIMARY KEY,
          approvers TEXT[] NOT NULL,
          required_approvals INTEGER NOT NULL DEFAULT 1,
          auto_approve_for TEXT[],
          require_reason BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
            // Indexes
            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_approval_workflows_status
          ON approval_workflows(status, requested_at DESC);
      `);
            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_approval_workflows_config_id
          ON approval_workflows(config_id, status);
      `);
            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_approval_workflows_requested_by
          ON approval_workflows(requested_by, status);
      `);
            await client.query('COMMIT');
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
     * Create a new approval workflow for a configuration change
     */
    async createWorkflow(configId, proposedVersion, requestedBy, options = {}) {
        const changeId = (0, uuid_1.v4)();
        // Check if this environment has auto-approval
        const autoApprove = options.environment && this.autoApproveEnvironments.has(options.environment);
        // Get approval rules for this config
        const rules = await this.getApprovalRules(configId);
        const workflow = {
            id: (0, uuid_1.v4)(),
            changeId,
            configId,
            proposedVersion,
            requestedBy,
            requestedAt: new Date(),
            approvers: options.approvers || rules?.approvers || this.defaultApprovers,
            approvals: [],
            rejections: [],
            status: autoApprove ? 'approved' : 'pending',
            autoApproveFor: rules?.autoApproveFor,
            requiredApprovals: options.requiredApprovals ||
                rules?.requiredApprovals ||
                this.defaultRequiredApprovals,
            environment: options.environment,
            reason: options.reason,
        };
        // Store workflow
        await this.pool.query(`
      INSERT INTO approval_workflows (
        id, change_id, config_id, proposed_version, requested_by, requested_at,
        approvers, approvals, rejections, status, auto_approve_for,
        required_approvals, environment, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
            workflow.id,
            workflow.changeId,
            workflow.configId,
            JSON.stringify(workflow.proposedVersion),
            workflow.requestedBy,
            workflow.requestedAt,
            workflow.approvers,
            JSON.stringify(workflow.approvals),
            JSON.stringify(workflow.rejections),
            workflow.status,
            workflow.autoApproveFor || [],
            workflow.requiredApprovals,
            workflow.environment,
            workflow.reason,
        ]);
        this.events.emit('workflow:created', workflow);
        if (autoApprove) {
            console.info(`Auto-approved change ${changeId} for environment ${options.environment}`);
            this.events.emit('workflow:auto-approved', workflow);
        }
        return workflow;
    }
    /**
     * Approve a workflow
     */
    async approve(changeId, approver, comment) {
        const workflow = await this.getWorkflow(changeId);
        if (!workflow) {
            throw new Error(`Workflow ${changeId} not found`);
        }
        if (workflow.status !== 'pending') {
            throw new Error(`Cannot approve workflow in ${workflow.status} status`);
        }
        if (!workflow.approvers.includes(approver)) {
            throw new Error(`${approver} is not an authorized approver`);
        }
        // Check if already approved by this user
        if (workflow.approvals.some((a) => a.approver === approver)) {
            throw new Error(`${approver} has already approved this workflow`);
        }
        // Add approval
        const approval = {
            approver,
            approvedAt: new Date(),
            comment,
        };
        workflow.approvals.push(approval);
        // Check if we have enough approvals
        const isApproved = workflow.approvals.length >= (workflow.requiredApprovals ?? 1);
        if (isApproved) {
            workflow.status = 'approved';
        }
        // Update database
        await this.pool.query(`
      UPDATE approval_workflows
      SET approvals = $1, status = $2, updated_at = NOW()
      WHERE change_id = $3
    `, [JSON.stringify(workflow.approvals), workflow.status, changeId]);
        this.events.emit('workflow:approval-added', { workflow, approval });
        if (isApproved) {
            this.events.emit('workflow:approved', workflow);
        }
        return workflow;
    }
    /**
     * Reject a workflow
     */
    async reject(changeId, rejectedBy, reason) {
        const workflow = await this.getWorkflow(changeId);
        if (!workflow) {
            throw new Error(`Workflow ${changeId} not found`);
        }
        if (workflow.status !== 'pending') {
            throw new Error(`Cannot reject workflow in ${workflow.status} status`);
        }
        if (!workflow.approvers.includes(rejectedBy)) {
            throw new Error(`${rejectedBy} is not an authorized approver`);
        }
        // Add rejection
        const rejection = {
            rejectedBy,
            rejectedAt: new Date(),
            reason,
        };
        workflow.rejections.push(rejection);
        workflow.status = 'rejected';
        // Update database
        await this.pool.query(`
      UPDATE approval_workflows
      SET rejections = $1, status = $2, updated_at = NOW()
      WHERE change_id = $3
    `, [JSON.stringify(workflow.rejections), workflow.status, changeId]);
        this.events.emit('workflow:rejected', { workflow, rejection });
        return workflow;
    }
    /**
     * Mark a workflow as applied
     */
    async markApplied(changeId) {
        const workflow = await this.getWorkflow(changeId);
        if (!workflow) {
            throw new Error(`Workflow ${changeId} not found`);
        }
        if (workflow.status !== 'approved') {
            throw new Error(`Cannot apply workflow in ${workflow.status} status`);
        }
        workflow.status = 'applied';
        await this.pool.query(`
      UPDATE approval_workflows
      SET status = $1, applied_at = NOW(), updated_at = NOW()
      WHERE change_id = $2
    `, ['applied', changeId]);
        this.events.emit('workflow:applied', workflow);
        return workflow;
    }
    /**
     * Cancel a workflow
     */
    async cancel(changeId, cancelledBy) {
        const workflow = await this.getWorkflow(changeId);
        if (!workflow) {
            throw new Error(`Workflow ${changeId} not found`);
        }
        if (workflow.status !== 'pending') {
            throw new Error(`Cannot cancel workflow in ${workflow.status} status`);
        }
        await this.pool.query(`
      UPDATE approval_workflows
      SET status = 'cancelled', updated_at = NOW()
      WHERE change_id = $1
    `, [changeId]);
        this.events.emit('workflow:cancelled', { workflow, cancelledBy });
    }
    /**
     * Get a workflow by change ID
     */
    async getWorkflow(changeId) {
        const result = await this.pool.query('SELECT * FROM approval_workflows WHERE change_id = $1', [changeId]);
        if (result.rows.length === 0) {
            return undefined;
        }
        return this.mapRowToWorkflow(result.rows[0]);
    }
    /**
     * List workflows
     */
    async listWorkflows(filters = {}) {
        const conditions = [];
        const params = [];
        let paramIndex = 1;
        if (filters.status) {
            conditions.push(`status = $${paramIndex++}`);
            params.push(filters.status);
        }
        if (filters.configId) {
            conditions.push(`config_id = $${paramIndex++}`);
            params.push(filters.configId);
        }
        if (filters.requestedBy) {
            conditions.push(`requested_by = $${paramIndex++}`);
            params.push(filters.requestedBy);
        }
        if (filters.environment) {
            conditions.push(`environment = $${paramIndex++}`);
            params.push(filters.environment);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limitClause = filters.limit ? `LIMIT ${filters.limit}` : '';
        const result = await this.pool.query(`
      SELECT * FROM approval_workflows
      ${whereClause}
      ORDER BY requested_at DESC
      ${limitClause}
    `, params);
        return result.rows.map((row) => this.mapRowToWorkflow(row));
    }
    /**
     * Set approval rules for a configuration
     */
    async setApprovalRules(configId, rules) {
        await this.pool.query(`
      INSERT INTO approval_rules (
        config_id, approvers, required_approvals, auto_approve_for, require_reason
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (config_id) DO UPDATE SET
        approvers = EXCLUDED.approvers,
        required_approvals = EXCLUDED.required_approvals,
        auto_approve_for = EXCLUDED.auto_approve_for,
        require_reason = EXCLUDED.require_reason,
        updated_at = NOW()
    `, [
            configId,
            rules.approvers,
            rules.requiredApprovals,
            rules.autoApproveFor || [],
            rules.requireReason || false,
        ]);
        this.events.emit('rules:updated', { configId, rules });
    }
    /**
     * Get approval rules for a configuration
     */
    async getApprovalRules(configId) {
        const result = await this.pool.query('SELECT * FROM approval_rules WHERE config_id = $1', [configId]);
        if (result.rows.length === 0) {
            return undefined;
        }
        const row = result.rows[0];
        return {
            approvers: row.approvers,
            requiredApprovals: row.required_approvals,
            autoApproveFor: row.auto_approve_for,
            requireReason: row.require_reason,
        };
    }
    /**
     * Delete old workflows
     */
    async cleanupOldWorkflows(daysOld = 90) {
        const result = await this.pool.query(`
      DELETE FROM approval_workflows
      WHERE status IN ('applied', 'rejected', 'cancelled')
        AND updated_at < NOW() - INTERVAL '${daysOld} days'
    `);
        return result.rowCount || 0;
    }
    /**
     * Listen for events
     */
    on(event, listener) {
        this.events.on(event, listener);
    }
    mapRowToWorkflow(row) {
        return {
            id: row.id,
            changeId: row.change_id,
            configId: row.config_id,
            proposedVersion: row.proposed_version,
            requestedBy: row.requested_by,
            requestedAt: new Date(row.requested_at),
            approvers: row.approvers,
            approvals: row.approvals.map((a) => ({
                ...a,
                approvedAt: new Date(a.approvedAt),
            })),
            rejections: row.rejections.map((r) => ({
                ...r,
                rejectedAt: new Date(r.rejectedAt),
            })),
            status: row.status,
            autoApproveFor: row.auto_approve_for,
            requiredApprovals: row.required_approvals,
            environment: row.environment,
            reason: row.reason,
        };
    }
}
exports.ApprovalWorkflowManager = ApprovalWorkflowManager;
exports.default = ApprovalWorkflowManager;
