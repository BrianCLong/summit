/**
 * Tests for PostgreSQL Database Connection
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { Pool, PoolClient } from 'pg';
import { PostgreSQLConnection } from '../postgres.js';

// Mock dependencies
jest.mock('pg');
jest.mock('../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('PostgreSQLConnection', () => {
  let connection: any;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as any;

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
      end: jest.fn().mockResolvedValue(undefined),
      totalCount: 10,
      idleCount: 5,
      waitingCount: 0,
    } as any;

    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool);

    // Create a fresh instance for each test
    const PostgreSQLConnectionClass = require('../postgres.js').default;
    connection = new (PostgreSQLConnectionClass ||
      class PostgreSQLConnection {})();

    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should establish connection with default configuration', async () => {
      delete process.env.POSTGRES_HOST;
      delete process.env.POSTGRES_PORT;
      delete process.env.POSTGRES_DB;
      delete process.env.POSTGRES_USER;
      delete process.env.POSTGRES_PASSWORD;

      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await connection.connect();

      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 5432,
          database: 'intelgraph',
          user: 'intelgraph',
          password: 'password',
        }),
      );
    });

    it('should establish connection with environment configuration', async () => {
      process.env.POSTGRES_HOST = 'postgres.example.com';
      process.env.POSTGRES_PORT = '5433';
      process.env.POSTGRES_DB = 'testdb';
      process.env.POSTGRES_USER = 'testuser';
      process.env.POSTGRES_PASSWORD = 'testpass';

      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await connection.connect();

      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'postgres.example.com',
          port: 5433,
          database: 'testdb',
          user: 'testuser',
          password: 'testpass',
        }),
      );

      // Clean up
      delete process.env.POSTGRES_HOST;
      delete process.env.POSTGRES_PORT;
      delete process.env.POSTGRES_DB;
      delete process.env.POSTGRES_USER;
      delete process.env.POSTGRES_PASSWORD;
    });

    it('should configure SSL for production environment', async () => {
      process.env.NODE_ENV = 'production';
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await connection.connect();

      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          ssl: { rejectUnauthorized: false },
        }),
      );

      delete process.env.NODE_ENV;
    });

    it('should skip connection if already connected', async () => {
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await connection.connect();
      const firstPoolInstance = Pool;

      await connection.connect();

      // Should only create pool once
      expect(Pool).toHaveBeenCalledTimes(1);
    });

    it('should throw error when connection fails', async () => {
      mockPool.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(connection.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);
      await connection.connect();
    });

    it('should execute query successfully', async () => {
      const mockResult = {
        rows: [{ id: 1, name: 'Test' }],
        rowCount: 1,
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await connection.query(
        'SELECT * FROM users WHERE id = $1',
        [1],
      );

      expect(result).toEqual(mockResult);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1],
      );
    });

    it('should log slow queries', async () => {
      const { logger } = require('../utils/logger.js');
      const mockResult = { rows: [], rowCount: 0 };

      mockPool.query.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockResult as any), 1100),
          ),
      );

      await connection.query('SELECT * FROM large_table');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Slow PostgreSQL query',
        }),
      );
    });

    it('should throw error when pool not initialized', async () => {
      const uninitializedConnection = new (require('../postgres.js').default ||
        class {})();

      await expect(uninitializedConnection.query('SELECT 1')).rejects.toThrow(
        'PostgreSQL pool not initialized',
      );
    });

    it('should handle query errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Query failed'));

      await expect(connection.query('INVALID SQL')).rejects.toThrow(
        'Query failed',
      );
    });

    it('should use provided client if available', async () => {
      const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
      mockClient.query.mockResolvedValue(mockResult as any);

      const result = await connection.query(
        'SELECT * FROM users',
        [],
        mockClient,
      );

      expect(mockClient.query).toHaveBeenCalled();
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('getClient', () => {
    beforeEach(async () => {
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);
      await connection.connect();
    });

    it('should return a pool client', async () => {
      const client = await connection.getClient();

      expect(client).toBe(mockClient);
      expect(mockPool.connect).toHaveBeenCalled();
    });

    it('should throw error when pool not initialized', async () => {
      const uninitializedConnection = new (require('../postgres.js').default ||
        class {})();

      await expect(uninitializedConnection.getClient()).rejects.toThrow(
        'PostgreSQL pool not initialized',
      );
    });
  });

  describe('transaction', () => {
    beforeEach(async () => {
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);
      await connection.connect();
    });

    it('should execute transaction successfully', async () => {
      const callback = jest.fn().mockResolvedValue('result');

      const result = await connection.transaction(callback);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should rollback transaction on error', async () => {
      const callback = jest
        .fn()
        .mockRejectedValue(new Error('Transaction failed'));

      await expect(connection.transaction(callback)).rejects.toThrow(
        'Transaction failed',
      );

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release client even if commit fails', async () => {
      const callback = jest.fn().mockResolvedValue('result');
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // BEGIN
        .mockRejectedValueOnce(new Error('Commit failed')); // COMMIT

      await expect(connection.transaction(callback)).rejects.toThrow();

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    beforeEach(async () => {
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);
      await connection.connect();
    });

    it('should find one record', async () => {
      const mockRow = { id: 1, email: 'test@example.com' };
      mockPool.query.mockResolvedValue({ rows: [mockRow], rowCount: 1 } as any);

      const result = await connection.findOne('users', { id: 1 });

      expect(result).toEqual(mockRow);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1 LIMIT 1',
        [1],
      );
    });

    it('should return null when no record found', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await connection.findOne('users', { id: 999 });

      expect(result).toBeNull();
    });

    it('should handle multiple conditions', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await connection.findOne('users', {
        email: 'test@example.com',
        is_active: true,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE email = $1 AND is_active = $2'),
        ['test@example.com', true],
      );
    });
  });

  describe('findMany', () => {
    beforeEach(async () => {
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);
      await connection.connect();
    });

    it('should find multiple records', async () => {
      const mockRows = [{ id: 1 }, { id: 2 }];
      mockPool.query.mockResolvedValue({ rows: mockRows, rowCount: 2 } as any);

      const result = await connection.findMany('users', { is_active: true });

      expect(result).toEqual(mockRows);
    });

    it('should support orderBy option', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await connection.findMany('users', {}, { orderBy: 'created_at DESC' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        [],
      );
    });

    it('should support limit and offset options', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await connection.findMany('users', {}, { limit: 10, offset: 20 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 10'),
        [],
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('OFFSET 20'),
        [],
      );
    });

    it('should handle empty conditions', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await connection.findMany('users');

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users', []);
    });
  });

  describe('insert', () => {
    beforeEach(async () => {
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);
      await connection.connect();
    });

    it('should insert record and return result', async () => {
      const mockRow = { id: 1, name: 'John', email: 'john@example.com' };
      mockPool.query.mockResolvedValue({ rows: [mockRow], rowCount: 1 } as any);

      const result = await connection.insert('users', {
        name: 'John',
        email: 'john@example.com',
      });

      expect(result).toEqual(mockRow);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['John', 'john@example.com'],
      );
    });

    it('should support custom RETURNING clause', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: 1 }],
        rowCount: 1,
      } as any);

      await connection.insert('users', { name: 'John' }, 'id');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('RETURNING id'),
        ['John'],
      );
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);
      await connection.connect();
    });

    it('should update record and return result', async () => {
      const mockRow = { id: 1, name: 'Jane' };
      mockPool.query.mockResolvedValue({ rows: [mockRow], rowCount: 1 } as any);

      const result = await connection.update(
        'users',
        { name: 'Jane' },
        { id: 1 },
      );

      expect(result).toEqual(mockRow);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['Jane', 1],
      );
    });

    it('should return null when no record updated', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await connection.update(
        'users',
        { name: 'Jane' },
        { id: 999 },
      );

      expect(result).toBeNull();
    });

    it('should handle multiple update fields and conditions', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: 1 }],
        rowCount: 1,
      } as any);

      await connection.update(
        'users',
        { name: 'Jane', email: 'jane@example.com' },
        { id: 1, tenant_id: 'tenant1' },
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SET name = $1, email = $2'),
        ['Jane', 'jane@example.com', 1, 'tenant1'],
      );
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);
      await connection.connect();
    });

    it('should delete record and return count', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 1 } as any);

      const count = await connection.delete('users', { id: 1 });

      expect(count).toBe(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = $1',
        [1],
      );
    });

    it('should return 0 when no record deleted', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const count = await connection.delete('users', { id: 999 });

      expect(count).toBe(0);
    });
  });

  describe('healthCheck', () => {
    beforeEach(async () => {
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);
      await connection.connect();
    });

    it('should return healthy status when connected', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ version: 'PostgreSQL 15.0', current_time: new Date() }],
        rowCount: 1,
      } as any);

      const health = await connection.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details).toHaveProperty('connected');
      expect(health.details).toHaveProperty('totalCount');
    });

    it('should return disconnected status when pool not initialized', async () => {
      const uninitializedConnection = new (require('../postgres.js').default ||
        class {})();

      const health = await uninitializedConnection.healthCheck();

      expect(health.status).toBe('disconnected');
    });

    it('should return unhealthy status on error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      const health = await connection.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details).toHaveProperty('error');
    });
  });

  describe('close', () => {
    it('should close connection and clean up', async () => {
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);
      await connection.connect();

      await connection.close();

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle close when not connected', async () => {
      await expect(connection.close()).resolves.not.toThrow();
    });
  });
});
