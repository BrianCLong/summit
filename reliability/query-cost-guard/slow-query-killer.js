"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.terminateSlowQuery = terminateSlowQuery;
const postgres_1 = require("../../server/src/db/postgres");
const logger_1 = __importDefault(require("../../server/src/config/logger"));
const comprehensive_telemetry_1 = require("../../server/src/lib/telemetry/comprehensive-telemetry");
const logger = logger_1.default.child({ name: 'SlowQueryKiller' });
/**
 * Finds and terminates a PostgreSQL query that exceeds its execution time limit.
 *
 * @param config The configuration for the slow query killer.
 * @returns A Promise that resolves to true if a query was terminated, and false otherwise.
 */
async function terminateSlowQuery(config) {
    const { timeoutMs, queryLabel } = config;
    const pool = (0, postgres_1.getPostgresPool)();
    try {
        const findQuery = `
      SELECT pid, query
      FROM pg_stat_activity
      WHERE state = 'active'
        AND now() - query_start > $1::interval
        AND query ILIKE $2;
    `;
        const interval = `${timeoutMs / 1000} seconds`;
        const pattern = `%${queryLabel}%`;
        // Use the write pool for this, as we need to connect to the primary to cancel queries.
        const result = await pool.write(findQuery, [interval, pattern]);
        if (result.rows.length === 0) {
            // No slow query found with the given label.
            return false;
        }
        for (const row of result.rows) {
            const pid = row.pid;
            logger.warn({ pid, query: row.query, timeoutMs }, 'Terminating slow query.');
            // Use pg_cancel_backend to safely terminate the query.
            await pool.write('SELECT pg_cancel_backend($1)', [pid]);
            comprehensive_telemetry_1.telemetry.slowQueriesKilled.add(1);
        }
        return true;
    }
    catch (error) {
        logger.error({ err: error, queryLabel }, 'Error while trying to terminate a slow query.');
        // We don't re-throw here as this is a background/cleanup task.
        return false;
    }
}
