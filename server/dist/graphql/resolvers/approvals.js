import { PendingAgentActionRepo } from '../../repos/PendingAgentActionRepo.js';
import { ProvenanceRepo } from '../../repos/ProvenanceRepo.js';
import { getPostgresPool } from '../../db/postgres.js';
import { agentDualControlApprovalsTotal, agentDualControlDenialsTotal } from '../../monitoring/metrics.js';
import crypto from 'crypto';
import { ExecutionGuard } from '../../services/ExecutionGuard.js';
import { ConfigService } from '../../services/ConfigService.js';
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const pg = getPostgresPool();
const pendingRepo = new PendingAgentActionRepo(pg);
const provRepo = new ProvenanceRepo(pg);
export const approvalsResolvers = {
    Query: {
        async pendingAgentAction(_, { id }) {
            return pendingRepo.get(id);
        },
        async actionSafetyStatus(_, { actionId }) {
            const rec = await pendingRepo.get(actionId);
            if (!rec)
                return { actionId, status: 'EXECUTED', requiresDualControl: false };
            const map = { PENDING: 'PENDING', APPROVED: 'APPROVED', DENIED: 'DENIED', EXECUTED: 'EXECUTED', FAILED: 'FAILED' };
            let reasonCode = null;
            if (rec.status === 'DENIED')
                reasonCode = 'DUAL_CONTROL_DENIED';
            if (rec.status === 'CANCELLED')
                reasonCode = 'INCIDENT_CLOSED_CANCELLED';
            return {
                actionId,
                status: map[rec.status] || 'UNKNOWN',
                requiresDualControl: rec.status === 'PENDING' || rec.status === 'APPROVED',
                approvedBy: rec.approvedBy ?? null,
                approvedAt: rec.approvedAt ?? null,
                reason: rec.status === 'DENIED' ? 'Denied' : rec.status === 'CANCELLED' ? 'Cancelled' : null,
                appealUrl: ['DENIED', 'CANCELLED'].includes(rec.status) ? ConfigService.ombudsUrl() : null,
                reasonCode,
            };
        },
        async listPendingActions(_, { incidentId, limit = 50 }) {
            const sql = `SELECT id, incident_id, created_by, plan, status, approval_token, approved_by, approved_at, created_at, updated_at
                   FROM pending_agent_actions
                   ${incidentId ? 'WHERE incident_id = $1' : ''}
                   ORDER BY created_at DESC
                   LIMIT ${Math.min(Math.max(limit, 1), 200)}`;
            const { rows } = await pg.query(sql, incidentId ? [incidentId] : []);
            return rows.map((r) => ({
                id: r.id,
                incidentId: r.incident_id,
                createdBy: r.created_by,
                plan: r.plan,
                status: r.status,
                approvalToken: r.approval_token,
                approvedBy: r.approved_by,
                approvedAt: r.approved_at,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
            }));
        },
    },
    Mutation: {
        async approvePendingAgentAction(_, { id }, ctx) {
            const approverId = ctx?.user?.id || 'approver';
            const rec = await pendingRepo.get(id);
            if (!rec)
                throw new Error('not found');
            await pendingRepo.approve(id, approverId);
            agentDualControlApprovalsTotal.inc({ tenant: ctx?.tenant?.id || 'unknown', action: rec.plan.playbook || 'unknown' });
            await provRepo.record({ kind: 'policy', hash: sha('dual-control-approved'), incidentId: rec.incidentId, actorId: approverId });
            return true;
        },
        async denyPendingAgentAction(_, { id }, ctx) {
            const approverId = ctx?.user?.id || 'approver';
            const rec = await pendingRepo.get(id);
            if (!rec)
                throw new Error('not found');
            await pendingRepo.deny(id, approverId);
            agentDualControlDenialsTotal.inc({ tenant: ctx?.tenant?.id || 'unknown', action: rec.plan.playbook || 'unknown' });
            await provRepo.record({ kind: 'policy', hash: sha('dual-control-denied'), incidentId: rec.incidentId, actorId: approverId });
            const appealUrl = ConfigService.ombudsUrl();
            if (appealUrl) {
                await provRepo.record({ kind: 'policy', hash: sha('appeal-url'), incidentId: rec.incidentId, actorId: approverId });
            }
            const { GraphQLError } = await import('graphql');
            throw new GraphQLError('Dual-control denial', {
                extensions: { code: 'DUAL_CONTROL_DENIED', reason: 'denied', reasonCode: 'DUAL_CONTROL_DENIED', appealUrl: appealUrl || null },
            });
        },
        async resumeApprovedAgentAction(_, { id }, ctx) {
            const tenantId = ctx?.tenant?.id || 'unknown';
            const approverId = ctx?.user?.id || 'approver';
            const rec = await pendingRepo.get(id);
            if (!rec)
                throw new Error('not found');
            if (rec.status !== 'APPROVED')
                throw new Error('not approved');
            // Secure execution guard (attestation + SBOM)
            const guard = new ExecutionGuard({
                AttestationService: {
                    verifyGpuOrFail: async () => {
                        if (process.env.GPU_ATTESTATION_REQUIRED === 'true' && process.env.GPU_ATTESTED !== 'true') {
                            throw new Error('GPU attestation failed');
                        }
                    },
                },
                SBOMPolicy: {
                    checkOrFail: async () => {
                        if (process.env.SBOM_POLICY_ENFORCED === 'true' && process.env.SBOM_POLICY_OK !== 'true') {
                            throw new Error('SBOM policy check failed');
                        }
                    },
                },
            });
            await guard.runAll({ tenantId });
            await provRepo.record({ kind: 'action', hash: sha('start'), incidentId: rec.incidentId, actorId: approverId });
            let ok = true;
            let result = {};
            try {
                result = await ctx.services?.SOARExecutor?.execute(rec.plan.playbook, rec.plan.parameters);
            }
            catch (e) {
                ok = false;
                result = { error: e?.message || 'execution failed' };
            }
            await pendingRepo.markExecuted(id, ok);
            await provRepo.record({ kind: 'action', hash: sha(JSON.stringify(result)), incidentId: rec.incidentId, actorId: approverId });
            return await pendingRepo.get(id);
        },
    },
};
export default approvalsResolvers;
//# sourceMappingURL=approvals.js.map