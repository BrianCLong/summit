import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Production Guardrails', () => {
  const originalEnv = process.env;
  let exitMock: any;
  let consoleErrorMock: any;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    exitMock = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`PROCESS_EXIT_${code}`);
    }) as any);
    consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    exitMock.mockRestore();
    consoleErrorMock.mockRestore();
  });

  const importConfig = async () => {
    // In ESM, simply re-importing might not re-execute if not using a query param to bust cache,
    // but jest.resetModules() handles this for us in a Jest environment.
    return await import('../../src/config.ts');
  };

  it('should fail booting in production with default secrets', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'secret'; // Too short/default
    process.env.JWT_REFRESH_SECRET = 'secret';
    // Ensure other vars are present to avoid early exit on missing vars
    process.env.DATABASE_URL = 'postgresql://u:p@h:5432/db';
    process.env.NEO4J_URI = 'bolt://h:7687';
    process.env.NEO4J_USER = 'neo4j';
    process.env.NEO4J_PASSWORD = 'p';

    // We expect it to call process.exit(1)
    await expect(importConfig()).rejects.toThrow('PROCESS_EXIT_1');
    expect(consoleErrorMock).toHaveBeenCalledWith(expect.stringContaining('Production Configuration Error'));
  });

  it('should fail booting in production with localhost CORS', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a_very_long_secure_random_string_of_at_least_32_chars';
    process.env.JWT_REFRESH_SECRET = 'another_very_long_secure_random_string_of_at_least_32_chars';
    process.env.DATABASE_URL = 'postgresql://user:pass@db.prod:5432/db';
    process.env.NEO4J_URI = 'bolt://db.prod:7687';
    process.env.NEO4J_USER = 'neo4j';
    process.env.NEO4J_PASSWORD = 'securepassword';
    process.env.REDIS_PASSWORD = 'securepassword';
    process.env.CORS_ORIGIN = 'http://localhost:3000'; // Fail

    await expect(importConfig()).rejects.toThrow('PROCESS_EXIT_1');
    expect(consoleErrorMock).toHaveBeenCalledWith(expect.stringContaining('CORS_ORIGIN'));
  });

  it('should pass in production with valid config', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a_very_long_secure_random_string_of_at_least_32_chars';
    process.env.JWT_REFRESH_SECRET = 'another_very_long_secure_random_string_of_at_least_32_chars';
    process.env.DATABASE_URL = 'postgresql://user:pass@db.prod:5432/db';
    process.env.NEO4J_URI = 'bolt://db.prod:7687';
    process.env.NEO4J_USER = 'neo4j';
    process.env.NEO4J_PASSWORD = 'securepassword';
    process.env.REDIS_PASSWORD = 'securepassword';
    process.env.CORS_ORIGIN = 'https://app.example.com';

    // Should not throw
    await expect(importConfig()).resolves.not.toThrow();
  });
});
