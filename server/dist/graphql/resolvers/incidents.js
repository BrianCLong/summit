import crypto from 'crypto';
import { PendingAgentActionRepo } from '../../repos/PendingAgentActionRepo.js';
import { ProvenanceRepo } from '../../repos/ProvenanceRepo.js';
import { getPostgresPool } from '../../db/postgres.js';
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const pg = getPostgresPool();
const pendingRepo = new PendingAgentActionRepo(pg);
const provRepo = new ProvenanceRepo(pg);
export const incidentResolvers = {
    Mutation: {
        async closeIncident(_, { id, reason }, ctx) {
            const tenantId = ctx?.tenant?.id || null;
            const actorId = ctx?.user?.id || null;
            // Close incident (best-effort) if incidents table exists
            try {
                await pg.query(`UPDATE incidents SET status='closed', updated_at=NOW() WHERE id=$1`, [id]);
            }
            catch { }
            const affected = await pendingRepo.cancelByIncident(id);
            if (affected > 0) {
                try {
                    ctx?.metrics?.agent_dual_control_cancellations_total?.inc({ tenant: tenantId || 'global' }, affected);
                }
                catch { }
                const { ConfigService } = await import('../../services/ConfigService.js');
                const appealUrl = ConfigService.ombudsUrl();
                await provRepo.record({
                    kind: 'policy',
                    hash: sha(`cancel:incident:${id}:count:${affected}`),
                    incidentId: id,
                    actorId,
                    // implicit metadata: reasonCode
                });
                if (appealUrl) {
                    await provRepo.record({ kind: 'policy', hash: sha('appeal-url'), incidentId: id, actorId });
                }
                try {
                    ctx?.tracer?.addEvent?.('incident.pending_cancelled', { incidentId: id, cancelled: String(affected) });
                }
                catch { }
            }
            return { id, status: 'CLOSED' };
        },
    },
};
export default incidentResolvers;
//# sourceMappingURL=incidents.js.map