import { getPostgresPool } from '../../server/src/db/postgres';
import baseLogger from '../../server/src/config/logger';

const logger = baseLogger.child({ name: 'QueryCostEstimator' });

/**
 * Represents the estimated cost of a database query.
 */
export interface QueryCost {
  /**
   * The total estimated cost of the query plan.
   */
  totalCost: number;
  /**
   * The estimated cost for the query startup phase.
   */
  startupCost: number;
}

/**
 * The structure of the query plan returned by PostgreSQL's EXPLAIN (FORMAT JSON).
 * This is a partial interface, only including the fields relevant for cost estimation.
 */
interface ExplainPlan {
  Plan: {
    'Total Cost': number;
    'Startup Cost': number;
  };
}

/**
 * Estimates the cost of a PostgreSQL query using the EXPLAIN command.
 *
 * @param sql The SQL query string.
 * @param params An array of parameters for the query.
 * @returns A Promise that resolves to a QueryCost object.
 * @throws An error if the query is invalid or the cost cannot be determined.
 */
export async function estimateQueryCost(sql: string, params: any[] = []): Promise<QueryCost> {
  const pool = getPostgresPool();
  const explainQuery = `EXPLAIN (FORMAT JSON) ${sql}`;

  try {
    // We use the 'read' pool for EXPLAIN as it's a read-only operation.
    const result = await pool.read(explainQuery, params);

    if (result.rows.length === 0 || !result.rows[0]['QUERY PLAN']) {
      throw new Error('Could not retrieve query plan.');
    }

    const plan = result.rows[0]['QUERY PLAN'][0] as ExplainPlan;

    if (!plan.Plan || typeof plan.Plan['Total Cost'] !== 'number') {
      throw new Error('Invalid query plan format.');
    }

    return {
      totalCost: plan.Plan['Total Cost'],
      startupCost: plan.Plan['Startup Cost'],
    };
  } catch (error) {
    logger.error({ err: error, sql }, 'Failed to estimate query cost.');
    // Re-throw the error to be handled by the caller.
    throw error;
  }
}
