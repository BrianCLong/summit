import { PendingAgentActionRepo } from '../repos/PendingAgentActionRepo.js';
import { getPostgresPool } from '../db/postgres.js';
export class PendingCleanupService {
    deps;
    repo = new PendingAgentActionRepo(getPostgresPool());
    constructor(deps = {}) {
        this.deps = deps;
    }
    async cancelStale(tenantId, ttlHours) {
        const cutIso = new Date(Date.now() - ttlHours * 3600 * 1000).toISOString();
        const n = await this.repo.cancelOlderThan(tenantId, cutIso);
        try {
            this.deps.metrics?.agent_dual_control_cancellations_total?.inc({ tenant: tenantId }, n);
        }
        catch { }
        this.deps.logger?.info?.('[pending-cleanup] cancelled stale', { tenantId, cancelled: n, ttlHours });
        return n;
    }
}
//# sourceMappingURL=PendingCleanupService.js.map