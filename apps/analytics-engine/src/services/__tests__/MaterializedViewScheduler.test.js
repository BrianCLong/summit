"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const MaterializedViewScheduler_1 = require("../MaterializedViewScheduler");
(0, globals_1.describe)('MaterializedViewScheduler', () => {
    (0, globals_1.it)('records refresh metrics and staleness', async () => {
        const now = new Date();
        const queryMock = globals_1.jest
            .fn()
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValue({
            rows: [
                {
                    view_name: 'maestro.mv_reporting_entity_activity',
                    refreshed_at: now.toISOString(),
                    duration_ms: 25,
                    row_count: 12,
                    status: 'ok',
                    error: null,
                },
            ],
        });
        const pool = { query: queryMock };
        const scheduler = new MaterializedViewScheduler_1.MaterializedViewScheduler(pool, {
            enabled: true,
            intervalMs: 10_000,
            stalenessBudgetSeconds: 900,
            useConcurrentRefresh: true,
            viewNames: ['maestro.mv_reporting_entity_activity'],
        });
        const results = await scheduler.refreshNow();
        (0, globals_1.expect)(queryMock).toHaveBeenCalledTimes(2);
        (0, globals_1.expect)(results.length).toBeGreaterThan(0);
        (0, globals_1.expect)(results[0].viewName).toBe('maestro.mv_reporting_entity_activity');
        (0, globals_1.expect)(scheduler.getStalenessSeconds()).toBeGreaterThanOrEqual(0);
        const snapshot = scheduler.getSnapshot();
        (0, globals_1.expect)(snapshot.views['maestro.mv_reporting_entity_activity']?.rowCount).toBe(12);
    });
});
