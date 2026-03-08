"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateQueryCost = estimateQueryCost;
const postgres_1 = require("../../server/src/db/postgres");
const logger_1 = __importDefault(require("../../server/src/config/logger"));
const logger = logger_1.default.child({ name: 'QueryCostEstimator' });
/**
 * Estimates the cost of a PostgreSQL query using the EXPLAIN command.
 *
 * @param sql The SQL query string.
 * @param params An array of parameters for the query.
 * @returns A Promise that resolves to a QueryCost object.
 * @throws An error if the query is invalid or the cost cannot be determined.
 */
async function estimateQueryCost(sql, params = []) {
    const pool = (0, postgres_1.getPostgresPool)();
    const explainQuery = `EXPLAIN (FORMAT JSON) ${sql}`;
    try {
        // We use the 'read' pool for EXPLAIN as it's a read-only operation.
        const result = await pool.read(explainQuery, params);
        if (result.rows.length === 0 || !result.rows[0]['QUERY PLAN']) {
            throw new Error('Could not retrieve query plan.');
        }
        const plan = result.rows[0]['QUERY PLAN'][0];
        if (!plan.Plan || typeof plan.Plan['Total Cost'] !== 'number') {
            throw new Error('Invalid query plan format.');
        }
        return {
            totalCost: plan.Plan['Total Cost'],
            startupCost: plan.Plan['Startup Cost'],
        };
    }
    catch (error) {
        logger.error({ err: error, sql }, 'Failed to estimate query cost.');
        // Re-throw the error to be handled by the caller.
        throw error;
    }
}
