/**
 * Example: Database Clients with Resilience Patterns
 *
 * This demonstrates how to wrap existing database clients with
 * resilience patterns (retry, timeout, graceful degradation)
 */

import pino from 'pino';
import {
  executeNeo4jQuery,
  executePostgresQuery,
  executeRedisOperation,
} from '../database.js';

const logger = pino({ name: 'DatabaseClients' });

/**
 * Example: Enhanced Neo4j Client
 */
export class ResilientNeo4jClient {
  constructor(private driver: any) {}

  /**
   * Run query with resilience patterns
   */
  async query<T = any>(
    cypher: string,
    parameters: Record<string, any> = {},
    options?: {
      timeoutMs?: number;
      retryable?: boolean;
    },
  ): Promise<T[]> {
    return executeNeo4jQuery(
      'query',
      async () => {
        const session = this.driver.session();

        try {
          const result = await session.run(cypher, parameters);
          return result.records.map((record: any) => record.toObject());
        } finally {
          await session.close();
        }
      },
      options,
    );
  }

  /**
   * Run write transaction with retry
   */
  async writeTransaction<T>(
    fn: (tx: any) => Promise<T>,
    options?: {
      timeoutMs?: number;
    },
  ): Promise<T> {
    return executeNeo4jQuery(
      'writeTransaction',
      async () => {
        const session = this.driver.session();

        try {
          return await session.executeWrite(fn);
        } finally {
          await session.close();
        }
      },
      options,
    );
  }

  /**
   * Run read transaction with retry
   */
  async readTransaction<T>(
    fn: (tx: any) => Promise<T>,
    options?: {
      timeoutMs?: number;
    },
  ): Promise<T> {
    return executeNeo4jQuery(
      'readTransaction',
      async () => {
        const session = this.driver.session();

        try {
          return await session.executeRead(fn);
        } finally {
          await session.close();
        }
      },
      options,
    );
  }
}

/**
 * Example: Enhanced PostgreSQL Client
 */
export class ResilientPostgresClient {
  constructor(private pool: any) {}

  /**
   * Run query with resilience patterns
   */
  async query<T = any>(
    text: string,
    params: any[] = [],
    options?: {
      timeoutMs?: number;
      retryable?: boolean;
    },
  ): Promise<T[]> {
    return executePostgresQuery(
      'query',
      async () => {
        const result = await this.pool.query(text, params);
        return result.rows;
      },
      options,
    );
  }

  /**
   * Run transaction with automatic rollback
   */
  async transaction<T>(fn: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

/**
 * Example: Enhanced Redis Client with Graceful Degradation
 */
export class ResilientRedisClient {
  constructor(private client: any) {}

  /**
   * Get value with graceful degradation
   * Returns null if Redis is unavailable instead of throwing
   */
  async get<T = any>(key: string): Promise<T | null> {
    return executeRedisOperation(
      'get',
      async () => {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
      },
      null, // Fallback to null if Redis fails
    );
  }

  /**
   * Set value with graceful degradation
   * Logs error but doesn't throw if Redis is unavailable
   */
  async set(
    key: string,
    value: any,
    ttlSeconds?: number,
  ): Promise<boolean> {
    return executeRedisOperation(
      'set',
      async () => {
        const serialized = JSON.stringify(value);

        if (ttlSeconds) {
          await this.client.setex(key, ttlSeconds, serialized);
        } else {
          await this.client.set(key, serialized);
        }

        return true;
      },
      false, // Fallback to false if Redis fails
    );
  }

  /**
   * Delete key with graceful degradation
   */
  async del(key: string): Promise<boolean> {
    return executeRedisOperation(
      'del',
      async () => {
        const result = await this.client.del(key);
        return result > 0;
      },
      false,
    );
  }

  /**
   * Get multiple keys with graceful degradation
   */
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    return executeRedisOperation(
      'mget',
      async () => {
        const values = await this.client.mget(...keys);
        return values.map((v: string | null) =>
          v ? JSON.parse(v) : null,
        );
      },
      keys.map(() => null), // Fallback to array of nulls
    );
  }
}

/**
 * Example usage in a service:
 *
 * import { ResilientNeo4jClient } from '@intelgraph/error-handling/examples/database-clients';
 *
 * const neo4jClient = new ResilientNeo4jClient(neo4jDriver);
 *
 * // Query with automatic retry and timeout
 * const entities = await neo4jClient.query(
 *   'MATCH (e:Entity {id: $id}) RETURN e',
 *   { id: entityId },
 *   { timeoutMs: 5000 }
 * );
 *
 * // Write transaction with retry
 * const result = await neo4jClient.writeTransaction(async (tx) => {
 *   await tx.run('CREATE (e:Entity {id: $id, name: $name})', { id, name });
 *   return { id, name };
 * });
 */
