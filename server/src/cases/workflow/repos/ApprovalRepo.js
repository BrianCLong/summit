"use strict";
/**
 * Approval Repository - Data access layer for case approvals and votes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalRepo = void 0;
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../../../config/logger.js"));
const repoLogger = logger_js_1.default.child({ name: 'ApprovalRepo' });
class ApprovalRepo {
    pg;
    constructor(pg) {
        this.pg = pg;
    }
    // ==================== APPROVALS ====================
    /**
     * Create an approval request
     */
    async createApproval(input) {
        const id = (0, crypto_1.randomUUID)();
        // Determine required approvers based on type
        let requiredApprovers = input.requiredApprovers || 2;
        if (input.approvalType === '4-eyes') {
            requiredApprovers = 2;
        }
        const { rows } = await this.pg.query(`INSERT INTO maestro.case_approvals (
        id, case_id, task_id, approval_type, required_approvers,
        required_role_id, requested_by, reason, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`, [
            id,
            input.caseId,
            input.taskId || null,
            input.approvalType,
            requiredApprovers,
            input.requiredRoleId || null,
            input.requestedBy,
            input.reason,
            JSON.stringify(input.metadata || {}),
        ]);
        repoLogger.info({
            approvalId: id,
            caseId: input.caseId,
            approvalType: input.approvalType,
        }, 'Approval request created');
        return this.mapApprovalRow(rows[0]);
    }
    /**
     * Get approval by ID
     */
    async getApproval(id) {
        const { rows } = await this.pg.query(`SELECT * FROM maestro.case_approvals WHERE id = $1`, [id]);
        return rows[0] ? this.mapApprovalRow(rows[0]) : null;
    }
    /**
     * List approvals with filters
     */
    async list(filters) {
        const params = [];
        const conditions = [];
        let paramIndex = 1;
        if (filters.caseId) {
            conditions.push(`case_id = $${paramIndex}`);
            params.push(filters.caseId);
            paramIndex++;
        }
        if (filters.status) {
            conditions.push(`status = $${paramIndex}`);
            params.push(filters.status);
            paramIndex++;
        }
        if (filters.approvalType) {
            conditions.push(`approval_type = $${paramIndex}`);
            params.push(filters.approvalType);
            paramIndex++;
        }
        // If filtering by user, join with votes to exclude already voted
        let fromClause = 'maestro.case_approvals';
        if (filters.userId) {
            fromClause = `maestro.case_approvals a
        LEFT JOIN maestro.case_approval_votes v
          ON v.approval_id = a.id AND v.approver_user_id = $${paramIndex}`;
            params.push(filters.userId);
            paramIndex++;
            conditions.push(`v.id IS NULL`); // User hasn't voted yet
            conditions.push(`a.status = 'pending'`); // Only pending approvals
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limit = Math.min(filters.limit || 50, 1000);
        const offset = filters.offset || 0;
        const selectPrefix = filters.userId ? 'a.*' : '*';
        const { rows } = await this.pg.query(`SELECT ${selectPrefix} FROM ${fromClause}
       ${whereClause}
       ORDER BY requested_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...params, limit, offset]);
        return rows.map(this.mapApprovalRow);
    }
    /**
     * Get approvals for a case
     */
    async getCaseApprovals(caseId, status) {
        return this.list({ caseId, status });
    }
    /**
     * Get pending approvals for a user
     */
    async getPendingApprovalsForUser(userId) {
        const { rows } = await this.pg.query(`SELECT * FROM maestro.get_pending_approvals_for_user($1)`, [userId]);
        return rows.map((row) => ({
            approvalId: row.approval_id,
            caseId: row.case_id,
            caseTitle: row.case_title,
            approvalType: row.approval_type,
            reason: row.reason,
            requestedAt: row.requested_at,
            requiredApprovers: row.required_approvers,
            currentApprovals: row.current_approvals,
        }));
    }
    /**
     * Update approval status
     */
    async updateApprovalStatus(id, status, decisionReason) {
        const { rows } = await this.pg.query(`UPDATE maestro.case_approvals
       SET status = $2,
           completed_at = NOW(),
           decision_reason = COALESCE($3, decision_reason)
       WHERE id = $1
       RETURNING *`, [id, status, decisionReason || null]);
        if (rows[0]) {
            repoLogger.info({ approvalId: id, status }, 'Approval status updated');
        }
        return rows[0] ? this.mapApprovalRow(rows[0]) : null;
    }
    /**
     * Cancel approval
     */
    async cancelApproval(id) {
        return this.updateApprovalStatus(id, 'cancelled');
    }
    // ==================== VOTES ====================
    /**
     * Submit an approval vote
     */
    async submitVote(input) {
        const id = (0, crypto_1.randomUUID)();
        const { rows } = await this.pg.query(`INSERT INTO maestro.case_approval_votes (
        id, approval_id, approver_user_id, decision, reason, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`, [
            id,
            input.approvalId,
            input.approverUserId,
            input.decision,
            input.reason || null,
            JSON.stringify(input.metadata || {}),
        ]);
        repoLogger.info({
            voteId: id,
            approvalId: input.approvalId,
            decision: input.decision,
        }, 'Approval vote submitted');
        return this.mapVoteRow(rows[0]);
    }
    /**
     * Get votes for an approval
     */
    async getApprovalVotes(approvalId) {
        const { rows } = await this.pg.query(`SELECT * FROM maestro.case_approval_votes
       WHERE approval_id = $1
       ORDER BY voted_at ASC`, [approvalId]);
        return rows.map(this.mapVoteRow);
    }
    /**
     * Get vote by approval and user
     */
    async getUserVote(approvalId, userId) {
        const { rows } = await this.pg.query(`SELECT * FROM maestro.case_approval_votes
       WHERE approval_id = $1 AND approver_user_id = $2`, [approvalId, userId]);
        return rows[0] ? this.mapVoteRow(rows[0]) : null;
    }
    /**
     * Check if approval is complete
     */
    async checkApprovalComplete(approvalId) {
        const approval = await this.getApproval(approvalId);
        if (!approval) {
            throw new Error('Approval not found');
        }
        const { rows } = await this.pg.query(`SELECT
        COUNT(*) FILTER (WHERE decision = 'approve') as approve_count,
        COUNT(*) FILTER (WHERE decision = 'reject') as reject_count
       FROM maestro.case_approval_votes
       WHERE approval_id = $1`, [approvalId]);
        const approveCount = parseInt(rows[0].approve_count, 10);
        const rejectCount = parseInt(rows[0].reject_count, 10);
        let isComplete = false;
        let status = 'pending';
        // Check if threshold met
        if (approveCount >= approval.requiredApprovers) {
            isComplete = true;
            status = 'approved';
        }
        else if (approval.approvalType === '4-eyes' && rejectCount > 0) {
            // For 4-eyes, one rejection fails the approval
            isComplete = true;
            status = 'rejected';
        }
        return {
            isComplete,
            status,
            approveCount,
            rejectCount,
        };
    }
    // ==================== MAPPERS ====================
    mapApprovalRow(row) {
        return {
            id: row.id,
            caseId: row.case_id,
            taskId: row.task_id,
            approvalType: row.approval_type,
            requiredApprovers: row.required_approvers,
            requiredRoleId: row.required_role_id,
            status: row.status,
            requestedBy: row.requested_by,
            requestedAt: row.requested_at,
            completedAt: row.completed_at,
            reason: row.reason,
            decisionReason: row.decision_reason,
            metadata: row.metadata || {},
        };
    }
    mapVoteRow(row) {
        return {
            id: row.id,
            approvalId: row.approval_id,
            approverUserId: row.approver_user_id,
            decision: row.decision,
            reason: row.reason,
            votedAt: row.voted_at,
            metadata: row.metadata || {},
        };
    }
}
exports.ApprovalRepo = ApprovalRepo;
