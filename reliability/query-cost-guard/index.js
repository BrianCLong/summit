"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryCostGuard = exports.QueryCostGuard = void 0;
const config_1 = require("../config");
const cost_estimator_1 = require("./cost-estimator");
const budget_manager_1 = require("./budget-manager");
const slow_query_killer_1 = require("./slow-query-killer");
const postgres_1 = require("../../server/src/db/postgres");
const comprehensive_telemetry_1 = require("../../server/src/lib/telemetry/comprehensive-telemetry");
const errors_1 = require("../../server/src/lib/errors");
class QueryCostGuard {
    pool;
    constructor() {
        this.pool = (0, postgres_1.getPostgresPool)();
    }
    /**
     * Executes a query under the protection of the cost guard.
     *
     * @param sql The SQL query to execute.
     * @param params The parameters for the query.
     * @param config The configuration for this specific execution.
     * @returns A Promise that resolves with the query result.
     */
    async execute(sql, params, config) {
        if (!(0, config_1.isOpsGuardV1Enabled)()) {
            // If the feature flag is disabled, execute the query directly without any guards.
            return this.pool.query(sql, params, { label: config.queryLabel });
        }
        const { tenantId, maxCost, timeoutMs, queryLabel } = config;
        // 1. Estimate query cost
        const estimatedCost = await this.estimateAndRecordCost(sql, params, tenantId, maxCost);
        // 2. Check budget
        if (budget_manager_1.budgetManager.willExceedBudget(tenantId, estimatedCost.totalCost)) {
            comprehensive_telemetry_1.telemetry.subsystems.database.errors.add(1, { tenantId, reason: 'budget_exceeded' });
            throw new errors_1.AppError('Query budget exceeded.', 429, { tenantId });
        }
        // 3. Execute query with a watchdog for slow queries
        const watchdog = setTimeout(() => {
            (0, slow_query_killer_1.terminateSlowQuery)({ timeoutMs, queryLabel });
        }, timeoutMs + 1000); // Add a small buffer
        try {
            const result = await this.pool.query(sql, params, { label: queryLabel });
            budget_manager_1.budgetManager.recordCost(tenantId, estimatedCost.totalCost);
            return result;
        }
        catch (error) {
            comprehensive_telemetry_1.telemetry.subsystems.database.errors.add(1, { tenantId, reason: 'execution_error' });
            throw error;
        }
        finally {
            clearTimeout(watchdog);
        }
    }
    async estimateAndRecordCost(sql, params, tenantId, maxCost) {
        const estimatedCost = await (0, cost_estimator_1.estimateQueryCost)(sql, params);
        comprehensive_telemetry_1.telemetry.queryCostEstimated.record(estimatedCost.totalCost, { tenantId });
        if (estimatedCost.totalCost > maxCost) {
            comprehensive_telemetry_1.telemetry.subsystems.database.errors.add(1, { tenantId, reason: 'cost_exceeded' });
            throw new errors_1.AppError(`Query cost estimate (${estimatedCost.totalCost}) exceeds the maximum of ${maxCost}.`, 400, {
                tenantId,
                estimatedCost: estimatedCost.totalCost,
                maxCost,
            });
        }
        return estimatedCost;
    }
}
exports.QueryCostGuard = QueryCostGuard;
exports.queryCostGuard = new QueryCostGuard();
