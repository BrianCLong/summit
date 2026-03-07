
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { initializeConfig, resetConfig, cfg } from '../../server/src/config';

describe('Adversarial Security: Production Config Validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    resetConfig();
    // Set minimal valid production env
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://user:pass@prod-db:5432/db';
    process.env.NEO4J_URI = 'bolt://prod-neo:7687';
    process.env.NEO4J_USER = 'neo4j';
    process.env.NEO4J_PASSWORD = 'strong-password-123';
    process.env.JWT_SECRET = 'a-very-long-and-secure-secret-32-chars';
    process.env.JWT_REFRESH_SECRET = 'another-secure-secret-exactly-32-chars';
    process.env.CORS_ORIGIN = 'https://app.summit.io';
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
    // Cleanup any extra keys added during tests
    for (const key in process.env) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
  });

  it('should REJECT JWT secret shorter than 32 characters', () => {
    process.env.JWT_SECRET = 'too-short';
    expect(() => initializeConfig({ exitOnError: false })).toThrow();
  });

  it('should REJECT JWT secret with insecure keywords (e.g. "secret")', () => {
    process.env.JWT_SECRET = 'this-is-my-secret-key-32-characters-long';
    expect(() => initializeConfig({ exitOnError: false })).toThrow(/contains insecure token/);
  });

  it('should REJECT localhost URLs in production mode', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/db';
    expect(() => initializeConfig({ exitOnError: false })).toThrow(/contains localhost/);
  });

  it('should REJECT 127.0.0.1 in production mode', () => {
    process.env.NEO4J_URI = 'bolt://127.0.0.1:7687';
    expect(() => initializeConfig({ exitOnError: false })).toThrow(/contains localhost/);
  });

  it('should PERMIT legitimate remote hosts containing "localhost" as a suffix', () => {
    // This host should be allowed as it is NOT localhost but a valid sub-domain
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost.example.com:5432/db';
    expect(() => initializeConfig({ exitOnError: false })).not.toThrow();
  });

  it('should REJECT wildcard CORS origin in production', () => {
    process.env.CORS_ORIGIN = '*';
    expect(() => initializeConfig({ exitOnError: false })).toThrow(/must list explicit https origins/);
  });

  it('should REJECT HTTP CORS origin in production', () => {
    process.env.CORS_ORIGIN = 'http://insecure.com';
    expect(() => initializeConfig({ exitOnError: false })).toThrow(/must list explicit https origins/);
  });

  it('should FAIL CLOSED if GA_CLOUD=true and AWS_REGION is missing', () => {
    process.env.GA_CLOUD = 'true';
    delete process.env.AWS_REGION;
    expect(() => initializeConfig({ exitOnError: false })).toThrow(/AWS_REGION is required/);
  });

  it('should enforce lazy initialization via Proxy', () => {
    // Modify env AFTER Proxy is created but BEFORE first access
    process.env.JWT_SECRET = 'too-short';
    resetConfig();

    // Accessing a property should trigger validation and throw
    expect(() => cfg.JWT_SECRET).toThrow();
  });
});
