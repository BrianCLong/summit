import { jest, describe, it, expect } from '@jest/globals';
import { PgVectorSync } from '../src/lib/pgvector-sync';

// Mock pg
jest.mock('pg', () => {
  const mClient = {
    query: jest.fn((...args: any[]) => Promise.resolve({ rows: [], rowCount: 0 })),
    release: jest.fn(),
  };
  const mPool = {
    connect: jest.fn(() => Promise.resolve(mClient)),
    query: jest.fn((...args: any[]) => Promise.resolve({ rows: [], rowCount: 0 })),
    end: jest.fn(),
    on: jest.fn(),
  };
  return {
    default: {
      Pool: jest.fn(() => mPool),
    },
    Pool: jest.fn(() => mPool),
  };
});

describe('PgVectorSync Security', () => {
  it('should reject invalid table names to prevent SQL injection', async () => {
    const sync = new PgVectorSync({
      host: 'localhost',
      port: 5432,
      database: 'test',
      user: 'test',
      password: 'password',
      ssl: false
    });

    // malicious table name
    const maliciousOptions = { tableName: 'users; DROP TABLE users; --' };

    await expect(sync.ensureTable(maliciousOptions))
      .rejects
      .toThrow(/Invalid identifier/);
  });

  it('should reject invalid column names', async () => {
     const sync = new PgVectorSync({
      host: 'localhost',
      port: 5432,
      database: 'test',
      user: 'test',
      password: 'password',
      ssl: false
    });

    await expect(sync.ensureTable({ idColumn: 'id; --' }))
      .rejects
      .toThrow(/Invalid identifier/);
  });
});
