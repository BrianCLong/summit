"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertDualControlApproval = upsertDualControlApproval;
exports.getDualControlState = getDualControlState;
const postgres_js_1 = require("../postgres.js");
const safeRows = (result) => Array.isArray(result?.rows)
    ? result.rows
    : [];
const serializeReason = (input) => {
    if (!input.reason && !input.role && !input.attributes) {
        return null;
    }
    return JSON.stringify({
        reason: input.reason,
        role: input.role,
        attributes: input.attributes || {},
    });
};
const parseReason = (reason) => {
    if (!reason)
        return {};
    try {
        const parsed = JSON.parse(reason);
        return {
            reason: parsed.reason,
            role: parsed.role,
            attributes: parsed.attributes,
        };
    }
    catch {
        return { reason };
    }
};
const mapRow = (row) => {
    const parsed = parseReason(row.reason);
    return {
        runId: row.run_id,
        stepId: row.step_id,
        userId: row.user_id,
        verdict: row.verdict,
        createdAt: row.created_at ? new Date(row.created_at) : undefined,
        ...parsed,
    };
};
async function upsertDualControlApproval(approval) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const result = await pool.query(`INSERT INTO approvals (run_id, step_id, user_id, verdict, reason)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (run_id, step_id, user_id)
     DO UPDATE SET verdict = EXCLUDED.verdict, reason = EXCLUDED.reason
     RETURNING run_id, step_id, user_id, verdict, reason, created_at`, [
        approval.runId,
        approval.stepId,
        approval.userId,
        approval.verdict,
        serializeReason(approval),
    ]);
    const row = safeRows(result)[0];
    return mapRow(row);
}
async function getDualControlState(runId, stepId) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const result = await pool.query(`SELECT run_id, step_id, user_id, verdict, reason, created_at
     FROM approvals
     WHERE run_id = $1 AND step_id = $2`, [runId, stepId]);
    const approvals = safeRows(result).map(mapRow);
    return {
        approvals,
        approvalsCount: approvals.length,
        distinctApprovers: new Set(approvals.map((a) => a.userId)).size,
        declinations: approvals.filter((a) => a.verdict === 'declined').length,
    };
}
