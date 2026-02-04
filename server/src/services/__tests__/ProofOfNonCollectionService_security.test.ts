import { jest, describe, test, expect, beforeEach, afterAll } from '@jest/globals';

// Mock dependencies
jest.mock('../../db/redis.js', () => ({
  getRedisClient: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../db/postgres.js', () => ({
  getPostgresPool: jest.fn().mockReturnValue({}),
}));
jest.mock('../../utils/CircuitBreaker.js', () => ({
  CircuitBreaker: class {
    execute(fn: any) { return fn(); }
  }
}));
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

// We rely on the moduleNameMapper to provide the logger mock, but we need to spy on it.
// Since we use resetModules, we must inspect the instance used in the current run.

describe('ProofOfNonCollectionService Security', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('should throw error in PRODUCTION if PNC_SIGNING_SECRET is missing', async () => {
    process.env.NODE_ENV = 'production';
    // Satisfy config.ts requirements for production
    process.env.JWT_SECRET = 'a-very-long-secure-random-string-that-is-at-least-32-chars';
    process.env.JWT_REFRESH_SECRET = 'another-very-long-secure-random-string-that-is-at-least-32-chars';
    process.env.DATABASE_URL = 'postgresql://user:pass@db-prod:5432/intelgraph_prod';
    process.env.POSTGRES_PASSWORD = 'strong-production-password';
    process.env.NEO4J_URI = 'bolt://neo4j-prod:7687';
    process.env.NEO4J_PASSWORD = 'strong-production-password';
    process.env.REDIS_PASSWORD = 'strong-redis-password';
    process.env.CORS_ORIGIN = 'https://app.intelgraph.com';
    process.env.REDIS_HOST = 'redis-prod';

    delete process.env.PNC_SIGNING_SECRET;

    await expect(async () => {
      await import('../ProofOfNonCollectionService.js');
    }).rejects.toThrow('PNC_SIGNING_SECRET environment variable is required in production');
  });

  test('should warn in NON-PRODUCTION if PNC_SIGNING_SECRET is missing', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.PNC_SIGNING_SECRET;

    // Import logger first to spy on it
    const loggerModule = await import('../../utils/logger.js');
    const warnSpy = jest.spyOn(loggerModule.default, 'warn');

    // Import service (which uses the same logger module instance from current registry)
    await import('../ProofOfNonCollectionService.js');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('PNC_SIGNING_SECRET not set'),
    );
  });

  test('should NOT throw or warn if PNC_SIGNING_SECRET is present', async () => {
    process.env.NODE_ENV = 'production';
    // Satisfy config.ts requirements for production
    process.env.JWT_SECRET = 'a-very-long-secure-random-string-that-is-at-least-32-chars';
    process.env.JWT_REFRESH_SECRET = 'another-very-long-secure-random-string-that-is-at-least-32-chars';
    process.env.DATABASE_URL = 'postgresql://user:pass@db-prod:5432/intelgraph_prod';
    process.env.POSTGRES_PASSWORD = 'strong-production-password';
    process.env.NEO4J_URI = 'bolt://neo4j-prod:7687';
    process.env.NEO4J_PASSWORD = 'strong-production-password';
    process.env.REDIS_PASSWORD = 'strong-redis-password';
    process.env.CORS_ORIGIN = 'https://app.intelgraph.com';
    process.env.REDIS_HOST = 'redis-prod';

    process.env.PNC_SIGNING_SECRET = 'valid-secret-that-is-long-enough';

    // Import logger to spy
    const loggerModule = await import('../../utils/logger.js');
    const warnSpy = jest.spyOn(loggerModule.default, 'warn');

    await import('../ProofOfNonCollectionService.js');

    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('PNC_SIGNING_SECRET not set'),
    );
  });
});
