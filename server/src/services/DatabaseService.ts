import logger from '../utils/logger.js';

/**
 * @interface QueryResult
 * @description Represents the result of a database query, mirroring the structure of common database driver results.
 * @template T - The expected type of the rows returned.
 * @property {T[]} rows - An array of rows, where each row is an object of type T.
 */
export interface QueryResult<T = any> {
  rows: T[];
}

/**
 * @class DatabaseService
 * @description Provides a stubbed implementation of a database service.
 * This class is intended to be a placeholder and does not connect to a real database.
 * Its methods are designed to be extended or replaced by a full implementation.
 *
 * @example
 * ```typescript
 * const dbService = new DatabaseService();
 *
 * async function getUsers() {
 *   // Note: This is a stub and will return an empty array.
 *   const result = await dbService.query('SELECT * FROM users');
 *   console.log(result.rows);
 * }
 * ```
 */
export class DatabaseService {
  /**
   * @method query
   * @description Executes a SQL query. This is a stub method that logs the query if debugging is enabled
   * and returns an empty result set.
   * @template T - The expected type of the result rows.
   * @param {string} sql - The SQL query string to execute.
   * @param {unknown[]} [params=[]] - An array of parameters to be used with the query.
   * @returns {Promise<QueryResult<T>>} A promise that resolves to a QueryResult with an empty `rows` array.
   */
  async query<T = any>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    if (process.env.DEBUG_DB_QUERIES) {
      logger.debug('DatabaseService query (stub)', { sql, params });
    }
    return { rows: [] as T[] };
  }

  /**
   * @method getConnectionConfig
   * @description Returns the configuration for the database connection. This is a stub method.
   * @returns {Record<string, any>} An empty object.
   */
  getConnectionConfig(): Record<string, any> {
    return {};
  }
}
