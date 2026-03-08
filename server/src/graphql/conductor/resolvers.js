"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conductorResolvers = void 0;
const postgres_js_1 = require("../../db/postgres.js");
const approvals_js_1 = require("../../conductor/approvals.js");
const policy_action_gate_js_1 = require("../../middleware/policy-action-gate.js");
exports.conductorResolvers = {
    Mutation: {
        approveStep: async (_, { runId, stepId, justification }, ctx) => {
            const decision = await (0, policy_action_gate_js_1.evaluatePolicyAction)({
                action: 'approve_step',
                resource: 'maestro_run',
                tenantId: ctx?.user?.tenantId || ctx?.user?.tenant_id || 'unknown',
                userId: ctx?.user?.id || ctx?.user?.email,
                role: ctx?.user?.role || 'user',
                resourceAttributes: { runId, stepId },
                subjectAttributes: ctx?.user?.attributes || {},
                sessionContext: {
                    ipAddress: ctx?.req?.ip,
                    userAgent: ctx?.req?.get?.('User-Agent'),
                    timestamp: Date.now(),
                    sessionId: ctx?.req?.sessionID,
                },
            });
            if (!decision.allow) {
                throw new Error(`Forbidden: ${decision.reason || 'policy_denied'}`);
            }
            const pool = (0, postgres_js_1.getPostgresPool)();
            const userId = ctx?.user?.id || ctx?.user?.email || 'unknown';
            // Record decision in approvals table
            await pool.query(`INSERT INTO approvals(run_id, step_id, user_id, verdict, reason)
         VALUES ($1,$2,$3,'approved',$4)
         ON CONFLICT (run_id, step_id, user_id) DO UPDATE SET verdict='approved', reason=$4`, [runId, stepId, userId, justification]);
            // Emit event for audit
            await pool.query('INSERT INTO run_event (run_id, kind, payload) VALUES ($1,$2,$3)', [runId, 'approval.approved', { stepId, justification, userId }]);
            // Check M-of-N threshold
            const prog = await (0, approvals_js_1.approvalProgress)(runId, stepId);
            if (prog.satisfied) {
                await pool.query('UPDATE run_step SET status=$1, blocked_reason=NULL WHERE run_id=$2 AND step_id=$3', ['RUNNING', runId, stepId]);
            }
            return true;
        },
        declineStep: async (_, { runId, stepId, justification }, ctx) => {
            const pool = (0, postgres_js_1.getPostgresPool)();
            const userId = ctx?.user?.id || ctx?.user?.email || 'unknown';
            await pool.query(`INSERT INTO approvals(run_id, step_id, user_id, verdict, reason)
         VALUES ($1,$2,$3,'declined',$4)
         ON CONFLICT (run_id, step_id, user_id) DO UPDATE SET verdict='declined', reason=$4`, [runId, stepId, userId, justification]);
            await pool.query('INSERT INTO run_event (run_id, kind, payload) VALUES ($1,$2,$3)', [runId, 'approval.declined', { stepId, justification, userId }]);
            await pool.query('UPDATE run_step SET status=$1, blocked_reason=$2, ended_at=now() WHERE run_id=$3 AND step_id=$4', ['FAILED', `declined: ${justification}`, runId, stepId]);
            await pool.query('UPDATE run SET status=$1, ended_at=now() WHERE id=$2 AND status<>$1', ['FAILED', runId]);
            return true;
        },
    },
};
