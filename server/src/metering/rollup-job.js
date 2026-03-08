"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDailyRollup = runDailyRollup;
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
/**
 * Daily Rollup Job for Usage Metering
 * Aggregates raw usage_events into usage_summaries.
 */
async function runDailyRollup() {
    const pool = (0, database_js_1.getPostgresPool)();
    const client = await pool.connect();
    try {
        logger_js_1.default.info('Starting daily usage rollup job');
        await client.query('BEGIN');
        // Rollup logic: Aggregate by tenant, day, and event kind
        // We target the previous day to ensure all events are in
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().slice(0, 10);
        const periodStart = `${dateStr} 00:00:00+00`;
        const periodEnd = `${dateStr} 23:59:59.999+00`;
        const rollupQuery = `
      INSERT INTO usage_summaries (
        tenant_id,
        period_start,
        period_end,
        kind,
        total_quantity,
        unit,
        breakdown
      )
      SELECT
        tenant_id,
        $1::timestamptz as period_start,
        $2::timestamptz as period_end,
        kind,
        SUM(quantity) as total_quantity,
        MAX(unit) as unit,
        jsonb_object_agg(COALESCE(metadata->>'source', 'unknown'), quantity) as breakdown
      FROM usage_events
      WHERE occurred_at >= $1 AND occurred_at <= $2
      GROUP BY tenant_id, kind
      ON CONFLICT (tenant_id, period_start, period_end, kind)
      DO UPDATE SET
        total_quantity = EXCLUDED.total_quantity,
        breakdown = EXCLUDED.breakdown
    `;
        const result = await client.query(rollupQuery, [periodStart, periodEnd]);
        await client.query('COMMIT');
        logger_js_1.default.info(`Daily rollup complete. Processed rows: ${result.rowCount}`);
    }
    catch (error) {
        await client.query('ROLLBACK');
        logger_js_1.default.error({ error }, 'Daily usage rollup job failed');
        throw error;
    }
    finally {
        client.release();
    }
}
// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runDailyRollup()
        .then(() => process.exit(0))
        .catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
