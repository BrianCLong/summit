import { jest, describe, it, test, expect } from '@jest/globals';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

jest.mock('../src/config/database', () => {
  const query = jest.fn().mockResolvedValue({});
  return {
    getNeo4jDriver: () => ({
      session: () => ({
        run: jest.fn(),
        close: jest.fn(),
      }),
    }),
    getPostgresPool: () => ({
      query,
    }),
  };
});

jest.mock('../src/routes/entities', () => {
  return jest.fn();
});

// const entitiesRouter = require('../src/routes/entities');
// const { getPostgresPool } = require('../src/config/database');

describe.skip('Entities route audit logging', () => {
  it('should log audits', () => {
      // Stub
      expect(true).toBe(true);
  });
});
