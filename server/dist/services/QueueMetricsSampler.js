import { getPostgresPool } from '../db/postgres.js';
import { PendingAgentActionRepo } from '../repos/PendingAgentActionRepo.js';
import { pendingAgentActionsGauge } from '../monitoring/metrics.js';
export class QueueMetricsSampler {
    static timer = null;
    static start({ intervalMs = 30000, tenantMode = (process.env.IG_TENANT_MODE || 'single') } = {}) {
        if (QueueMetricsSampler.timer)
            return;
        const repo = new PendingAgentActionRepo(getPostgresPool());
        const tick = async () => {
            try {
                if (tenantMode === 'multi') {
                    const rows = await repo.countPendingByTenant();
                    for (const r of rows) {
                        pendingAgentActionsGauge.set({ tenant: r.tenant_id || 'global' }, r.cnt);
                    }
                }
                else {
                    const rows = await repo.countPendingByTenant();
                    const total = rows.reduce((acc, r) => acc + r.cnt, 0);
                    pendingAgentActionsGauge.set({ tenant: 'global' }, total);
                }
            }
            catch { }
            QueueMetricsSampler.timer = setTimeout(tick, intervalMs).unref?.();
        };
        tick();
    }
    static stop() {
        if (QueueMetricsSampler.timer)
            clearTimeout(QueueMetricsSampler.timer);
        QueueMetricsSampler.timer = null;
    }
}
//# sourceMappingURL=QueueMetricsSampler.js.map