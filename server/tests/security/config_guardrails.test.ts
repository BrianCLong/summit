
import { jest } from '@jest/globals';

// We need to mock process.exit before importing config
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
  throw new Error(`process.exit called with ${code}`);
});

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Production Security Guardrails', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    mockExit.mockClear();
    mockConsoleError.mockClear();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  const loadConfig = async () => {
    // We use dynamic import to re-evaluate the IIFE in config.ts
    await import('../../src/config.ts');
  };

  it('should pass in development mode with weak secrets', async () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'weak';
    process.env.JWT_REFRESH_SECRET = 'weak';
    process.env.DATABASE_URL = 'postgres://localhost:5432/db';
    process.env.NEO4J_URI = 'bolt://localhost:7687';
    process.env.NEO4J_USER = 'neo4j';
    process.env.NEO4J_PASSWORD = 'password';

    await expect(loadConfig()).resolves.not.toThrow();
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('should fail in production if JWT_SECRET is too short', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'short';
    process.env.JWT_REFRESH_SECRET = 'short';
    process.env.DATABASE_URL = 'postgres://prod-db:5432/db'; // Good DB
    process.env.NEO4J_URI = 'bolt://prod-neo4j:7687';
    process.env.NEO4J_USER = 'neo4j';
    process.env.NEO4J_PASSWORD = 'strongpassword123';
    process.env.CORS_ORIGIN = 'https://example.com';

    await expect(loadConfig()).rejects.toThrow('process.exit called with 1');
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('value too short'));
  });

  it('should fail in production if JWT_SECRET contains insecure tokens', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'super_secret_but_contains_secret_word_1234567890';
    process.env.JWT_REFRESH_SECRET = 'valid_refresh_secret_12345678901234567890';
    process.env.DATABASE_URL = 'postgres://prod-db:5432/db';
    process.env.NEO4J_URI = 'bolt://prod-neo4j:7687';
    process.env.NEO4J_USER = 'neo4j';
    process.env.NEO4J_PASSWORD = 'strongpassword123';
    process.env.CORS_ORIGIN = 'https://example.com';

    await expect(loadConfig()).rejects.toThrow('process.exit called with 1');
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('contains insecure token'));
  });

  it('should fail in production if CORS_ORIGIN contains localhost', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'valid_jwt_secret_12345678901234567890';
    process.env.JWT_REFRESH_SECRET = 'valid_refresh_secret_12345678901234567890';
    process.env.DATABASE_URL = 'postgres://prod-db:5432/db';
    process.env.NEO4J_URI = 'bolt://prod-neo4j:7687';
    process.env.NEO4J_USER = 'neo4j';
    process.env.NEO4J_PASSWORD = 'strongpassword123';
    process.env.CORS_ORIGIN = 'https://example.com, http://localhost:3000';

    await expect(loadConfig()).rejects.toThrow('process.exit called with 1');
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('must list explicit https origins'));
  });

  it('should fail in production if DATABASE_URL contains localhost', async () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'valid_jwt_secret_12345678901234567890';
      process.env.JWT_REFRESH_SECRET = 'valid_refresh_secret_12345678901234567890';
      process.env.DATABASE_URL = 'postgres://localhost:5432/db';
      process.env.NEO4J_URI = 'bolt://prod-neo4j:7687';
      process.env.NEO4J_USER = 'neo4j';
      process.env.NEO4J_PASSWORD = 'strongpassword123';
      process.env.CORS_ORIGIN = 'https://example.com';

      await expect(loadConfig()).rejects.toThrow('process.exit called with 1');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('contains localhost/devpassword'));
    });
});
