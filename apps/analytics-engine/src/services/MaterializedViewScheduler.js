"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterializedViewScheduler = void 0;
const logger_1 = require("../utils/logger");
const DEFAULT_VIEWS = [
    'maestro.mv_reporting_entity_activity',
    'maestro.mv_reporting_case_snapshot',
    'maestro.mv_reporting_case_timeline',
];
class MaterializedViewScheduler {
    pool;
    options;
    timer;
    snapshot = { views: {} };
    constructor(pool, options) {
        this.pool = pool;
        this.options = options;
    }
    start() {
        if (!this.options.enabled) {
            logger_1.logger.info('MV reporting disabled; scheduler not started');
            return;
        }
        const schedule = async () => {
            try {
                await this.refreshNow();
            }
            catch (error) {
                logger_1.logger.warn('Materialized view refresh failed (will retry on next interval)', { err: error });
            }
        };
        // Kick off an eager refresh and then set the interval.
        void schedule();
        this.timer = setInterval(schedule, this.options.intervalMs);
        // Avoid keeping the process alive purely for the scheduler.
        this.timer.unref?.();
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }
    async refreshNow() {
        // Respect the CONCURRENTLY override if an environment (pg-mem) cannot support it.
        const concurrentSetting = this.options.useConcurrentRefresh ? 'on' : 'off';
        await this.pool.query("SELECT set_config('maestro.reporting_refresh_concurrent', $1, false)", [concurrentSetting]);
        const startedAt = new Date();
        this.snapshot.lastRunStartedAt = startedAt;
        const { rows } = await this.pool.query('SELECT * FROM maestro.refresh_reporting_materialized_views()');
        const statuses = rows.map((row) => ({
            viewName: row.view_name,
            refreshedAt: row.refreshed_at ? new Date(row.refreshed_at) : undefined,
            durationMs: row.duration_ms ?? undefined,
            rowCount: row.row_count ?? undefined,
            status: row.status ?? 'ok',
            error: row.error ?? null,
        }));
        this.snapshot = {
            lastRunStartedAt: startedAt,
            lastRunCompletedAt: new Date(),
            lastError: undefined,
            views: {
                ...this.snapshot.views,
                ...Object.fromEntries(statuses.map((s) => [s.viewName, s])),
            },
        };
        logger_1.logger.info('Materialized view refresh completed', {
            views: statuses.map((s) => ({
                view: s.viewName,
                status: s.status,
                durationMs: s.durationMs,
                rows: s.rowCount,
            })),
        });
        return statuses;
    }
    getSnapshot() {
        return this.snapshot;
    }
    getStalenessSeconds(viewNames) {
        const targets = viewNames && viewNames.length > 0
            ? viewNames
            : this.options.viewNames || DEFAULT_VIEWS;
        const timestamps = targets
            .map((name) => this.snapshot.views[name]?.refreshedAt)
            .filter((value) => Boolean(value));
        if (timestamps.length === 0) {
            return undefined;
        }
        const maxAgeMs = Math.max(...timestamps.map((date) => Date.now() - date.getTime()));
        return Math.round(maxAgeMs / 1000);
    }
}
exports.MaterializedViewScheduler = MaterializedViewScheduler;
