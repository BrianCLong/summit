import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('[Invariant GC-03] Production Guardrails', () => {
  const originalEnv = process.env;
  let exitMock: jest.SpiedFunction<typeof process.exit>;
  let consoleErrorMock: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    exitMock = jest
      .spyOn(process, 'exit')
      .mockImplementation((code?: number | string | null): never => {
      throw new Error(`PROCESS_EXIT_${code}`);
      });
    consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    exitMock.mockRestore();
    consoleErrorMock.mockRestore();
  });

  const importConfig = async () => {
    return await import('../../src/config.js');
  };

  it('should fail booting in production with default JWT secrets, violating Invariant GC-03', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = `secret-${'a'.repeat(40)}`; // Long but contains insecure token
    process.env.JWT_REFRESH_SECRET = `refresh-${'b'.repeat(40)}`;
    process.env.DATABASE_URL = 'postgresql://u:p@h:5432/db';
    process.env.NEO4J_URI = 'bolt://h:7687';
    process.env.NEO4J_USER = 'neo4j';
    process.env.NEO4J_PASSWORD = 'p';
    process.env.CORS_ORIGIN = 'https://app.example.com';

    await expect(importConfig()).rejects.toThrow('PROCESS_EXIT_1');
    expect(consoleErrorMock).toHaveBeenCalledWith(expect.stringContaining('Invariant GC-03 Violated: Production environment cannot use default secrets.'));
  });

  it('should fail booting in production with a short refresh secret, violating Invariant GC-03', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = `secure-${'c'.repeat(40)}`;
    process.env.JWT_REFRESH_SECRET = `secret-${'d'.repeat(40)}`; // Long but contains insecure token
    process.env.DATABASE_URL = 'postgresql://u:p@h:5432/db';
    process.env.NEO4J_URI = 'bolt://h:7687';
    process.env.NEO4J_USER = 'neo4j';
    process.env.NEO4J_PASSWORD = 'p';
    process.env.CORS_ORIGIN = 'https://app.example.com';

    await expect(importConfig()).rejects.toThrow('PROCESS_EXIT_1');
    expect(consoleErrorMock).toHaveBeenCalledWith(expect.stringContaining('Invariant GC-03 Violated: Production environment cannot use default secrets.'));
  });

  it('should pass in production with valid secrets, upholding Invariant GC-03', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a_very_long_secure_random_string_of_at_least_32_chars';
    process.env.JWT_REFRESH_SECRET = 'another_very_long_secure_random_string_of_at_least_32_chars';
    process.env.DATABASE_URL = 'postgresql://user:pass@db.prod:5432/db';
    process.env.NEO4J_URI = 'bolt://db.prod:7687';
    process.env.NEO4J_USER = 'neo4j';
    process.env.NEO4J_PASSWORD = 'securepassword';
    process.env.REDIS_PASSWORD = 'securepassword';
    process.env.CORS_ORIGIN = 'https://app.example.com';

    await expect(importConfig()).resolves.not.toThrow();
  });
});
