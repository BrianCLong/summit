import { jest } from '@jest/globals';

jest.mock('dotenv/config', () => ({}));

const originalExit = process.exit;
let mockExit: jest.Mock;

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Production Security Guardrails', () => {
  const originalEnv = { ...process.env };
  const baseEnv = {
    ...originalEnv,
    DOTENV_CONFIG_OVERRIDE: 'false',
    DOTENV_CONFIG_PATH: '',
    DATABASE_URL: 'postgres://prod-db:5432/db',
    NEO4J_URI: 'bolt://prod-neo4j:7687',
    NEO4J_USER: 'neo4j',
    NEO4J_PASSWORD: 'strongpassword123',
    CORS_ORIGIN: 'https://example.com',
    JWT_SECRET: 'base_jwt_key_123456789012345678901234',
    JWT_REFRESH_SECRET: 'base_refresh_key_12345678901234567890',
    REDIS_PASSWORD: 'redis_strong_password_1234567890',
  };
  const resetEnv = () => {
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  };

  beforeEach(() => {
    jest.resetModules();
    mockExit = jest
      .spyOn(process, 'exit')
      .mockImplementation((code?: number | string | null) => {
        throw new Error(`process.exit called with ${code}`);
      }) as unknown as jest.Mock;
    mockConsoleError.mockClear();
    resetEnv();
  });

  afterAll(() => {
    mockExit.mockRestore();
    process.exit = originalExit;
    resetEnv();
    mockConsoleError.mockRestore();
  });

  const loadConfig = async () => {
    if (jest.isolateModulesAsync) {
      try {
        await jest.isolateModulesAsync(async () => {
          await import('../../src/config.js');
        });
        return null;
      } catch (error) {
        return error as Error;
      }
    } else {
      try {
        jest.isolateModules(() => {
          return import('../../src/config.js');
        });
        return null;
      } catch (error) {
        return error as Error;
      }
    }
  };

  it('should pass in development mode with weak secrets', async () => {
    Object.assign(process.env, baseEnv, {
      NODE_ENV: 'development',
      JWT_SECRET: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      JWT_REFRESH_SECRET: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      DATABASE_URL: 'postgres://localhost:5432/db',
      NEO4J_URI: 'bolt://localhost:7687',
      NEO4J_PASSWORD: 'password',
    });

    const error = await loadConfig();
    expect(error).toBeNull();
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('should fail in production if JWT_SECRET is too short', async () => {
    Object.assign(process.env, baseEnv, {
      NODE_ENV: 'production',
      JWT_SECRET: 'short',
      JWT_REFRESH_SECRET: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    });

    const error = await loadConfig();
    expect(error?.message).toContain('process.exit called with 1');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should fail in production if JWT_SECRET contains insecure tokens', async () => {
    Object.assign(process.env, baseEnv, {
      NODE_ENV: 'production',
      JWT_SECRET: 'super_secret_but_contains_secret_word_1234567890',
      JWT_REFRESH_SECRET: 'valid_refresh_secret_12345678901234567890',
    });

    const error = await loadConfig();
    expect(error?.message).toContain('process.exit called with 1');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should fail in production if CORS_ORIGIN contains localhost', async () => {
    Object.assign(process.env, baseEnv, {
      NODE_ENV: 'production',
      JWT_SECRET: 'valid_jwt_secret_12345678901234567890',
      JWT_REFRESH_SECRET: 'valid_refresh_secret_12345678901234567890',
      CORS_ORIGIN: 'https://example.com, http://localhost:3000',
    });

    const error = await loadConfig();
    expect(error?.message).toContain('process.exit called with 1');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should fail in production if DATABASE_URL contains localhost', async () => {
      Object.assign(process.env, baseEnv, {
        NODE_ENV: 'production',
        JWT_SECRET: 'valid_jwt_secret_12345678901234567890',
        JWT_REFRESH_SECRET: 'valid_refresh_secret_12345678901234567890',
        DATABASE_URL: 'postgres://localhost:5432/db',
      });

      const error = await loadConfig();
      expect(error?.message).toContain('process.exit called with 1');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
});
