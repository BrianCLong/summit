import { PendingAgentActionRepo } from '../repos/PendingAgentActionRepo.js';
import { ProvenanceRepo } from '../repos/ProvenanceRepo.js';
import { getPostgresPool } from '../db/postgres.js';
import crypto from 'crypto';
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
export class ApprovalsService {
    pg = getPostgresPool();
    pending = new PendingAgentActionRepo(this.pg);
    prov = new ProvenanceRepo(this.pg);
    async approveAndResume(id, approverId, opts = {}) {
        const rec = await this.pending.get(id);
        if (!rec || rec.status !== 'PENDING')
            throw new Error('Not pending or missing');
        await this.pending.approve(id, approverId);
        await this.prov.record({ kind: 'policy', hash: sha(`approval:${id}:${approverId}`), incidentId: rec.incidentId, actorId: approverId });
        await this.prov.record({ kind: 'action', hash: sha('start'), incidentId: rec.incidentId, actorId: approverId });
        // Execute via SOAR executor on context-less path is not available here.
        // This service is called from resolvers that have ctx.services.SOARExecutor; prefer resolver execution.
        return true;
    }
    async deny(id, approverId) {
        const rec = await this.pending.get(id);
        if (!rec || rec.status !== 'PENDING')
            throw new Error('Not pending or missing');
        await this.pending.deny(id, approverId);
        await this.prov.record({ kind: 'policy', hash: sha('dual-control-denied'), incidentId: rec.incidentId, actorId: approverId });
        return true;
    }
}
//# sourceMappingURL=ApprovalsService.js.map