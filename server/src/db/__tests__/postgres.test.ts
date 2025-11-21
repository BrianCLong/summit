/**
 * PostgreSQL Pool Test Suite
 *
 * Tests for:
 * - Connection pool initialization and configuration
 * - Read/write pool routing
 * - Circuit breaker functionality
 * - Retry logic with exponential backoff
 * - Query timeout handling
 * - Connection leak detection
 * - Slow query tracking
 * - Health checks
 * - Prepared statement caching
 */

import { jest } from '@jest/globals';
import {
  getPostgresPool,
  closePostgresPool,
  __private,
} from '../postgres';
import type { Pool, PoolClient } from 'pg';

// Mock pg module
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    totalCount: 10,
    idleCount: 5,
    waitingCount: 0,
  };

  return {
    Pool: jest.fn(() => mockPool),
  };
});

describe('PostgreSQL Pool', () => {
  let mockClient: jest.Mocked<PoolClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment variables
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_READ_REPLICAS;
    delete process.env.PG_WRITE_POOL_SIZE;
    delete process.env.PG_READ_POOL_SIZE;

    // Mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as any;
  });

  afterEach(async () => {
    await closePostgresPool();
  });

  describe('Initialization', () => {
    it('should initialize pool with default configuration', () => {
      const pool = getPostgresPool();

      expect(pool).toBeDefined();
      expect(pool.query).toBeDefined();
      expect(pool.read).toBeDefined();
      expect(pool.write).toBeDefined();
      expect(pool.connect).toBeDefined();
      expect(pool.healthCheck).toBeDefined();
    });

    it('should parse DATABASE_URL connection string', () => {
      process.env.DATABASE_URL =
        'postgresql://user:pass@localhost:5432/testdb';

      const pool = getPostgresPool();

      expect(pool).toBeDefined();
    });

    it('should parse individual connection parameters', () => {
      process.env.POSTGRES_HOST = 'test-host';
      process.env.POSTGRES_USER = 'test-user';
      process.env.POSTGRES_PASSWORD = 'test-pass';
      process.env.POSTGRES_DB = 'test-db';
      process.env.POSTGRES_PORT = '5433';

      const pool = getPostgresPool();

      expect(pool).toBeDefined();
    });

    it('should initialize read replicas from environment', () => {
      process.env.DATABASE_READ_REPLICAS =
        'postgresql://read1:5432/db,postgresql://read2:5432/db';

      const pool = getPostgresPool();

      expect(pool).toBeDefined();
    });

    it('should configure pool sizes from environment', () => {
      process.env.PG_WRITE_POOL_SIZE = '10';
      process.env.PG_READ_POOL_SIZE = '20';

      const pool = getPostgresPool();

      expect(pool).toBeDefined();
    });
  });

  describe('Query Routing', () => {
    let pool: any;

    beforeEach(() => {
      pool = getPostgresPool();
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);
      (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    });

    it('should route SELECT queries to read pool', async () => {
      mockClient.query.mockResolvedValueOnce(undefined); // SET statement_timeout
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // SELECT
      mockClient.query.mockResolvedValueOnce(undefined); // RESET statement_timeout

      await pool.read('SELECT * FROM users WHERE id = $1', ['user-123']);

      expect(mockClient.query).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should route INSERT queries to write pool', async () => {
      mockClient.query.mockResolvedValueOnce(undefined); // SET statement_timeout
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // INSERT
      mockClient.query.mockResolvedValueOnce(undefined); // RESET statement_timeout

      await pool.write('INSERT INTO users (email) VALUES ($1)', [
        'test@example.com',
      ]);

      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should route UPDATE queries to write pool', async () => {
      mockClient.query.mockResolvedValueOnce(undefined); // SET statement_timeout
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // UPDATE
      mockClient.query.mockResolvedValueOnce(undefined); // RESET statement_timeout

      await pool.write('UPDATE users SET email = $1 WHERE id = $2', [
        'new@example.com',
        'user-123',
      ]);

      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should route DELETE queries to write pool', async () => {
      mockClient.query.mockResolvedValueOnce(undefined); // SET statement_timeout
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // DELETE
      mockClient.query.mockResolvedValueOnce(undefined); // RESET statement_timeout

      await pool.write('DELETE FROM users WHERE id = $1', ['user-123']);

      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should auto-detect query type with query() method', async () => {
      mockClient.query.mockResolvedValueOnce(undefined); // SET statement_timeout
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // SELECT
      mockClient.query.mockResolvedValueOnce(undefined); // RESET statement_timeout

      await pool.query('SELECT * FROM users');

      expect(mockClient.query).toHaveBeenCalled();
    });
  });

  describe('Circuit Breaker', () => {
    it('should close circuit on success', () => {
      const breaker = new __private.CircuitBreaker('test-pool', 5, 30000);

      expect(breaker.canExecute()).toBe(true);
      breaker.recordSuccess();
      expect(breaker.getState()).toBe('closed');
    });

    it('should open circuit after threshold failures', () => {
      const breaker = new __private.CircuitBreaker('test-pool', 3, 30000);

      expect(breaker.canExecute()).toBe(true);

      breaker.recordFailure(new Error('Failure 1'));
      expect(breaker.getState()).toBe('closed');

      breaker.recordFailure(new Error('Failure 2'));
      expect(breaker.getState()).toBe('closed');

      breaker.recordFailure(new Error('Failure 3'));
      expect(breaker.getState()).toBe('open');
      expect(breaker.canExecute()).toBe(false);
    });

    it('should transition to half-open after cooldown', async () => {
      const breaker = new __private.CircuitBreaker('test-pool', 2, 100); // 100ms cooldown

      breaker.recordFailure(new Error('Failure 1'));
      breaker.recordFailure(new Error('Failure 2'));
      expect(breaker.getState()).toBe('open');

      // Wait for cooldown
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(breaker.canExecute()).toBe(true);
      expect(breaker.getState()).toBe('half-open');
    });

    it('should close circuit on success from half-open', async () => {
      const breaker = new __private.CircuitBreaker('test-pool', 2, 100);

      breaker.recordFailure(new Error('Failure 1'));
      breaker.recordFailure(new Error('Failure 2'));
      expect(breaker.getState()).toBe('open');

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(breaker.getState()).toBe('half-open');

      breaker.recordSuccess();
      expect(breaker.getState()).toBe('closed');
      expect(breaker.getFailureCount()).toBe(0);
    });

    it('should reopen circuit on failure from half-open', async () => {
      const breaker = new __private.CircuitBreaker('test-pool', 2, 100);

      breaker.recordFailure(new Error('Failure 1'));
      breaker.recordFailure(new Error('Failure 2'));
      expect(breaker.getState()).toBe('open');

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(breaker.getState()).toBe('half-open');

      breaker.recordFailure(new Error('Failure 3'));
      expect(breaker.getState()).toBe('open');
    });
  });

  describe('Retry Logic', () => {
    it('should identify retryable PostgreSQL errors', () => {
      const retryableError = { code: '57P01' }; // admin_shutdown
      expect(__private.isRetryableError(retryableError)).toBe(true);
    });

    it('should identify retryable network errors', () => {
      const networkError = { code: 'ECONNRESET' };
      expect(__private.isRetryableError(networkError)).toBe(true);
    });

    it('should not retry non-transient errors', () => {
      const constraintError = { code: '23505' }; // unique_violation
      expect(__private.isRetryableError(constraintError)).toBe(false);
    });

    it('should not retry null or undefined errors', () => {
      expect(__private.isRetryableError(null)).toBe(false);
      expect(__private.isRetryableError(undefined)).toBe(false);
    });
  });

  describe('Query Type Inference', () => {
    it('should infer SELECT as read query', () => {
      expect(__private.inferQueryType('SELECT * FROM users')).toBe('read');
    });

    it('should infer INSERT as write query', () => {
      expect(
        __private.inferQueryType('INSERT INTO users (email) VALUES ($1)'),
      ).toBe('write');
    });

    it('should infer UPDATE as write query', () => {
      expect(__private.inferQueryType('UPDATE users SET email = $1')).toBe(
        'write',
      );
    });

    it('should infer DELETE as write query', () => {
      expect(__private.inferQueryType('DELETE FROM users WHERE id = $1')).toBe(
        'write',
      );
    });

    it('should infer SHOW as read query', () => {
      expect(__private.inferQueryType('SHOW server_version')).toBe('read');
    });

    it('should infer EXPLAIN as read query', () => {
      expect(__private.inferQueryType('EXPLAIN SELECT * FROM users')).toBe(
        'read',
      );
    });

    it('should handle CTE with SELECT as read', () => {
      expect(
        __private.inferQueryType('WITH cte AS (SELECT * FROM users) SELECT *'),
      ).toBe('read');
    });

    it('should handle CTE with INSERT as write', () => {
      expect(
        __private.inferQueryType(
          'WITH cte AS (SELECT * FROM users) INSERT INTO logs',
        ),
      ).toBe('write');
    });

    it('should handle case-insensitive queries', () => {
      expect(__private.inferQueryType('select * from users')).toBe('read');
      expect(__private.inferQueryType('INSERT INTO USERS')).toBe('write');
    });
  });

  describe('Prepared Statements', () => {
    it('should generate consistent names for same query', () => {
      const query1 = 'SELECT * FROM users WHERE id = $1';
      const query2 = 'SELECT * FROM users WHERE id = $1';

      const name1 = __private.getPreparedStatementName(query1);
      const name2 = __private.getPreparedStatementName(query2);

      expect(name1).toBe(name2);
    });

    it('should generate different names for different queries', () => {
      const query1 = 'SELECT * FROM users WHERE id = $1';
      const query2 = 'SELECT * FROM posts WHERE id = $1';

      const name1 = __private.getPreparedStatementName(query1);
      const name2 = __private.getPreparedStatementName(query2);

      expect(name1).not.toBe(name2);
    });

    it('should normalize whitespace in queries', () => {
      const query1 = 'SELECT * FROM users WHERE id = $1';
      const query2 = 'SELECT   *   FROM   users   WHERE   id = $1';

      const name1 = __private.getPreparedStatementName(query1);
      const name2 = __private.getPreparedStatementName(query2);

      expect(name1).toBe(name2);
    });

    it('should generate names with stmt_ prefix', () => {
      const query = 'SELECT * FROM users';
      const name = __private.getPreparedStatementName(query);

      expect(name).toMatch(/^stmt_[a-f0-9]+$/);
    });
  });

  describe('Health Check', () => {
    let pool: any;

    beforeEach(() => {
      pool = getPostgresPool();
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);
      (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    });

    it('should return health status for all pools', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ result: 1 }] } as any);

      const health = await pool.healthCheck();

      expect(Array.isArray(health)).toBe(true);
      expect(health.length).toBeGreaterThan(0);
    });

    it('should include pool metrics in health check', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ result: 1 }] } as any);

      const health = await pool.healthCheck();

      health.forEach((snapshot: any) => {
        expect(snapshot.name).toBeDefined();
        expect(snapshot.type).toMatch(/^(read|write)$/);
        expect(snapshot.circuitState).toBeDefined();
        expect(typeof snapshot.healthy).toBe('boolean');
        expect(typeof snapshot.activeConnections).toBe('number');
        expect(typeof snapshot.idleConnections).toBe('number');
        expect(typeof snapshot.queuedRequests).toBe('number');
      });
    });

    it('should mark pool as unhealthy on connection failure', async () => {
      mockClient.query.mockRejectedValue(new Error('Connection failed'));

      const health = await pool.healthCheck();

      expect(health.some((h: any) => !h.healthy)).toBe(true);
    });
  });

  describe('Slow Query Insights', () => {
    let pool: any;

    beforeEach(() => {
      pool = getPostgresPool();
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);
      (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    });

    it('should track slow queries', async () => {
      // Simulate slow query by delaying response
      mockClient.query
        .mockResolvedValueOnce(undefined) // SET statement_timeout
        .mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { rows: [], rowCount: 0 };
        })
        .mockResolvedValueOnce(undefined); // RESET statement_timeout

      process.env.PG_SLOW_QUERY_THRESHOLD_MS = '50';

      await pool.query('SELECT * FROM large_table');

      const insights = pool.slowQueryInsights();
      expect(Array.isArray(insights)).toBe(true);
    });

    it('should return insights sorted by max duration', () => {
      const insights = pool.slowQueryInsights();

      if (insights.length > 1) {
        for (let i = 0; i < insights.length - 1; i++) {
          expect(insights[i].maxDurationMs).toBeGreaterThanOrEqual(
            insights[i + 1].maxDurationMs,
          );
        }
      }
    });
  });

  describe('Connection Management', () => {
    let pool: any;

    beforeEach(() => {
      pool = getPostgresPool();
    });

    it('should provide connect method for transactions', async () => {
      const mockTransactionClient = {
        query: jest.fn(),
        release: jest.fn(),
      } as any;

      (pool.connect as jest.Mock).mockResolvedValue(mockTransactionClient);

      const client = await pool.connect();

      expect(client).toBeDefined();
      expect(client.query).toBeDefined();
      expect(client.release).toBeDefined();
    });

    it('should release client after use', async () => {
      const mockTransactionClient = {
        query: jest.fn(),
        release: jest.fn(),
      } as any;

      (pool.connect as jest.Mock).mockResolvedValue(mockTransactionClient);

      const client = await pool.connect();
      client.release();

      expect(mockTransactionClient.release).toHaveBeenCalled();
    });

    it('should handle pool closure', async () => {
      await expect(closePostgresPool()).resolves.not.toThrow();
    });

    it('should allow event listeners', () => {
      const errorHandler = jest.fn();
      pool.on('error', errorHandler);

      expect(typeof pool.on).toBe('function');
    });
  });

  describe('Query Options', () => {
    let pool: any;

    beforeEach(() => {
      pool = getPostgresPool();
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);
      (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    });

    it('should respect custom timeout', async () => {
      mockClient.query.mockResolvedValueOnce(undefined); // SET statement_timeout
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockClient.query.mockResolvedValueOnce(undefined); // RESET statement_timeout

      await pool.query('SELECT * FROM users', [], { timeoutMs: 10000 });

      expect(mockClient.query).toHaveBeenCalledWith(
        'SET statement_timeout = $1',
        [10000],
      );
    });

    it('should support query labels', async () => {
      mockClient.query.mockResolvedValueOnce(undefined); // SET statement_timeout
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockClient.query.mockResolvedValueOnce(undefined); // RESET statement_timeout

      await pool.query('SELECT * FROM users', [], {
        label: 'fetch-user-list',
      });

      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should force write pool when forceWrite is true', async () => {
      mockClient.query.mockResolvedValueOnce(undefined); // SET statement_timeout
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockClient.query.mockResolvedValueOnce(undefined); // RESET statement_timeout

      await pool.query('SELECT * FROM users', [], { forceWrite: true });

      expect(mockClient.query).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    let pool: any;

    beforeEach(() => {
      pool = getPostgresPool();
      (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    });

    it('should throw error on query failure', async () => {
      mockClient.query.mockResolvedValueOnce(undefined); // SET statement_timeout
      mockClient.query.mockRejectedValueOnce(
        new Error('Syntax error in SQL'),
      );

      await expect(pool.query('INVALID SQL')).rejects.toThrow();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reset statement timeout even on error', async () => {
      mockClient.query.mockResolvedValueOnce(undefined); // SET statement_timeout
      mockClient.query.mockRejectedValueOnce(new Error('Query error'));
      mockClient.query.mockResolvedValueOnce(undefined); // RESET statement_timeout

      await expect(pool.query('SELECT * FROM users')).rejects.toThrow();

      expect(mockClient.query).toHaveBeenCalledWith('RESET statement_timeout');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle connection acquisition failure', async () => {
      (pool.connect as jest.Mock).mockRejectedValue(
        new Error('Connection pool exhausted'),
      );

      await expect(pool.query('SELECT 1')).rejects.toThrow();
    });
  });
});
