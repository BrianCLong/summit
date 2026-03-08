"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canApprove = void 0;
exports.createApproval = createApproval;
exports.listApprovals = listApprovals;
exports.getApprovalById = getApprovalById;
exports.approveApproval = approveApproval;
exports.rejectApproval = rejectApproval;
// @ts-nocheck
const postgres_js_1 = require("../db/postgres.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const metrics_js_1 = require("../monitoring/metrics.js");
const APPROVER_ROLES = new Set([
    'ADMIN',
    'SECURITY_ADMIN',
    'OPERATIONS',
    'SAFETY',
]);
const approvalsLogger = logger_js_1.default.child({ name: 'ApprovalsService' });
const safeRows = (result) => Array.isArray(result?.rows)
    ? result.rows
    : [];
const canApprove = (role) => {
    if (!role)
        return false;
    return APPROVER_ROLES.has(role.toUpperCase());
};
exports.canApprove = canApprove;
async function createApproval(input) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const result = await pool.query(`INSERT INTO approvals (requester_id, status, action, payload, reason, run_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`, [
        input.requesterId,
        'pending',
        input.action || null,
        JSON.stringify(input.payload || {}),
        input.reason || null,
        input.runId || null,
    ]);
    metrics_js_1.approvalsPending.inc();
    const approval = safeRows(result)[0];
    approvalsLogger.info({
        approval_id: approval?.id,
        action: approval?.action,
        requester: input.requesterId,
        run_id: input.runId,
    }, 'Approval requested');
    return approval;
}
async function listApprovals(options = {}) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const conditions = [];
    const params = [];
    let paramIdx = 1;
    if (options.status) {
        conditions.push(`status = $${paramIdx++}`);
        params.push(options.status);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(`SELECT * FROM approvals ${whereClause} ORDER BY created_at DESC`, params);
    return safeRows(result);
}
async function getApprovalById(id) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const result = await pool.query('SELECT * FROM approvals WHERE id = $1', [id]);
    const approvals = safeRows(result);
    return approvals[0] || null;
}
async function approveApproval(id, approverId, decisionReason) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const result = await pool.query(`UPDATE approvals
       SET status = 'approved',
           approver_id = $2,
           decision_reason = $3,
           resolved_at = NOW(),
           updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`, [id, approverId, decisionReason || null]);
    const approval = safeRows(result)[0];
    if (!approval)
        return null;
    metrics_js_1.approvalsPending.dec();
    metrics_js_1.approvalsApprovedTotal.inc();
    approvalsLogger.info({
        approval_id: approval.id,
        action: approval.action,
        approver: approverId,
        run_id: approval.run_id,
        decision_reason: decisionReason,
    }, 'Approval granted');
    return approval;
}
async function rejectApproval(id, approverId, decisionReason) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const result = await pool.query(`UPDATE approvals
       SET status = 'rejected',
           approver_id = $2,
           decision_reason = $3,
           resolved_at = NOW(),
           updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`, [id, approverId, decisionReason || null]);
    const approval = safeRows(result)[0];
    if (!approval)
        return null;
    metrics_js_1.approvalsPending.dec();
    metrics_js_1.approvalsRejectedTotal.inc();
    approvalsLogger.info({
        approval_id: approval.id,
        action: approval.action,
        approver: approverId,
        run_id: approval.run_id,
        decision_reason: decisionReason,
    }, 'Approval rejected');
    return approval;
}
