import logger from '../utils/logger.js';

export interface QueryResult<T = any> {
  rows: T[];
}

export class DatabaseService {
  async query<T = any>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    if (process.env.DEBUG_DB_QUERIES) {
      logger.debug('DatabaseService query (stub)', { sql, params });
    }
    return { rows: [] as T[] };
  }

  getConnectionConfig(): Record<string, any> {
    return {};
  }
}
