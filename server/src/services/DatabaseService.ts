import logger from '../utils/logger.js';
import { getPostgresPool, ManagedPostgresPool } from '../db/postgres.js';

/**
 * @interface QueryResult
 * @description Represents the result of a database query, mirroring the structure of common database driver results.
 * @template T - The expected type of the rows returned.
 * @property {T[]} rows - An array of rows, where each row is an object of type T.
 */
export interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number;
}

/**
 * @class DatabaseService
 * @description Wrapper around ManagedPostgresPool to provide a consistent interface for services.
 */
export class DatabaseService {
  private pool: ManagedPostgresPool;

  constructor() {
    this.pool = getPostgresPool();
  }

  /**
   * @method query
   * @description Executes a SQL query.
   * @template T - The expected type of the result rows.
   * @param {string} sql - The SQL query string to execute.
   * @param {unknown[]} [params=[]] - An array of parameters to be used with the query.
   * @returns {Promise<QueryResult<T>>}
   */
  async query<T = any>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    try {
      const result = await this.pool.query<T>(sql, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0
      };
    } catch (error) {
      logger.error('Database query failed', { sql, error });
      throw error;
    }
  }

  /**
   * @method getConnectionConfig
   * @description Returns the configuration for the database connection.
   * @returns {Record<string, any>}
   */
  getConnectionConfig(): Record<string, any> {
    return {};
  }
}
