import { isOpsGuardV1Enabled } from '../config';
import { estimateQueryCost, QueryCost } from './cost-estimator';
import { budgetManager } from './budget-manager';
import { terminateSlowQuery } from './slow-query-killer';
import { getPostgresPool, ManagedPostgresPool } from '../../server/src/db/postgres';
import { telemetry } from '../../server/src/lib/telemetry/comprehensive-telemetry';
import { AppError } from '../../server/src/lib/errors';
import { QueryResult } from 'pg';

export interface QueryCostGuardConfig {
  tenantId: string;
  queryLabel: string;
  maxCost: number;
  timeoutMs: number;
}

export class QueryCostGuard {
  private readonly pool: ManagedPostgresPool;

  constructor() {
    this.pool = getPostgresPool();
  }

  /**
   * Executes a query under the protection of the cost guard.
   *
   * @param sql The SQL query to execute.
   * @param params The parameters for the query.
   * @param config The configuration for this specific execution.
   * @returns A Promise that resolves with the query result.
   */
  public async execute<T = any>(
    sql: string,
    params: any[],
    config: QueryCostGuardConfig
  ): Promise<QueryResult<T>> {
    if (!isOpsGuardV1Enabled()) {
      // If the feature flag is disabled, execute the query directly without any guards.
      return this.pool.query(sql, params, { label: config.queryLabel });
    }

    const { tenantId, maxCost, timeoutMs, queryLabel } = config;

    // 1. Estimate query cost
    const estimatedCost = await this.estimateAndRecordCost(sql, params, tenantId, maxCost);

    // 2. Check budget
    if (budgetManager.willExceedBudget(tenantId, estimatedCost.totalCost)) {
      telemetry.subsystems.database.errors.add(1, { tenantId, reason: 'budget_exceeded' });
      throw new AppError('Query budget exceeded.', 429, { tenantId });
    }

    // 3. Execute query with a watchdog for slow queries
    const watchdog = setTimeout(() => {
      terminateSlowQuery({ timeoutMs, queryLabel });
    }, timeoutMs + 1000); // Add a small buffer

    try {
      const result = await this.pool.query(sql, params, { label: queryLabel });
      budgetManager.recordCost(tenantId, estimatedCost.totalCost);
      return result;
    } catch (error) {
      telemetry.subsystems.database.errors.add(1, { tenantId, reason: 'execution_error' });
      throw error;
    } finally {
      clearTimeout(watchdog);
    }
  }

  private async estimateAndRecordCost(
    sql: string,
    params: any[],
    tenantId: string,
    maxCost: number
  ): Promise<QueryCost> {
    const estimatedCost = await estimateQueryCost(sql, params);

    telemetry.queryCostEstimated.record(estimatedCost.totalCost, { tenantId });

    if (estimatedCost.totalCost > maxCost) {
      telemetry.subsystems.database.errors.add(1, { tenantId, reason: 'cost_exceeded' });
      throw new AppError(`Query cost estimate (${estimatedCost.totalCost}) exceeds the maximum of ${maxCost}.`, 400, {
        tenantId,
        estimatedCost: estimatedCost.totalCost,
        maxCost,
      });
    }

    return estimatedCost;
  }
}

export const queryCostGuard = new QueryCostGuard();
