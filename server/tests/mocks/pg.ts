import { jest } from '@jest/globals';
import { newDb } from 'pg-mem';

const db = newDb();

// Register some custom functions if needed, or extensions
db.public.registerFunction({
    name: 'current_database',
    implementation: () => 'test_db',
});
db.public.registerFunction({
    name: 'version',
    implementation: () => 'PostgreSQL 14.0 (pg-mem)',
});

// Mock pg-vector if needed (pg-mem might not support it fully, but basic inserts might work)
// db.public.none('CREATE EXTENSION IF NOT EXISTS vector'); // pg-mem doesn't support vector types natively easily

const { Client: PgMemClient, Pool: PgMemPool } = db.adapters.createPg();

export const mockClient = {
  query: jest.fn().mockImplementation(async (text: string, params: any[]) => {
      console.log('PG MOCK QUERY:', text);
      // Intercept specific queries if needed, otherwise pass to pg-mem
      try {
          // pg-mem might throw on unsupported syntax
          // We can create a throw-away client/pool from pg-mem to run the query
          const client = new PgMemClient();
          await client.connect();
          const result = await client.query(text, params);
          await client.end();
          console.log('PG MOCK RETURN (success):', result);
          return result;
      } catch (e) {
          console.warn('pg-mem query failed, returning empty result:', text, e.message);
          return { rowCount: 0, rows: [] };
      }
  }),
  release: jest.fn(),
  on: jest.fn(),
  end: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(undefined),
};

export const mockPool = {
  query: jest.fn().mockImplementation((text: string, params: any[]) => mockClient.query(text, params)),
  connect: jest.fn().mockResolvedValue(mockClient),
  on: jest.fn(),
  end: jest.fn().mockResolvedValue(undefined),
  totalCount: 0,
  idleCount: 0,
  waitingCount: 0,
};

// We need to support the class constructor usage: new Pool(), new Client()
export class Pool {
    constructor() {
        return mockPool;
    }
}

export class Client {
    constructor() {
        return mockClient;
    }
}

export const types = {
  setTypeParser: jest.fn(),
  getTypeParser: jest.fn().mockReturnValue((val: string) => val),
};

export default { Pool, Client, types, mockPool, mockClient };
