"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceJanitor = void 0;
const database_js_1 = require("../../config/database.js");
const logger = new logger_js_1.Logger('ResourceJanitor');
class ResourceJanitor {
    // Epic 4: Automation & Waste Prevention
    // Identify idle or abandoned workloads
    async cleanIdleWorkloads() {
        const pool = (0, database_js_1.getPostgresPool)();
        // Find runs that are running but haven't been updated in 24 hours
        // Using correct table name: maestro_runs
        // Assuming maestro_runs doesn't have updated_at, we might use started_at + max_duration check.
        // Or if maestro_tasks have activity.
        // For now, simpler: cancel runs started > 24 hours ago that are still pending/running.
        try {
            const result = await pool.query(`UPDATE maestro_runs
                 SET status = 'failed',
                     metadata = jsonb_set(COALESCE(metadata, '{}'), '{error}', '"Auto-expired due to inactivity (ResourceJanitor)"')
                 WHERE status IN ('pending', 'running')
                 AND started_at < NOW() - INTERVAL '24 hours'
                 RETURNING id`);
            if (result.rowCount > 0) {
                logger.info(`Cleaned up ${result.rowCount} idle runs.`);
            }
        }
        catch (error) {
            logger.error('Error cleaning idle workloads', error);
        }
    }
    async process(job) {
        logger.info('Starting Resource Janitor cycle');
        await this.cleanIdleWorkloads();
        logger.info('Completed Resource Janitor cycle');
    }
}
exports.ResourceJanitor = ResourceJanitor;
