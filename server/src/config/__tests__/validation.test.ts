import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { ConfigSchema } from '../schema';
import { z } from 'zod';

describe('Config Validation', () => {
  it('should apply defaults for empty input', () => {
    const res = ConfigSchema.parse({});
    expect(res.port).toBe(4000);
    expect(res.env).toBe('development');
    expect(res.neo4j.uri).toBe('bolt://localhost:7687');
  });

  it('should coerce types correctly', () => {
    const res = ConfigSchema.parse({
      port: '8080',
      rateLimit: {
        maxRequests: '500'
      }
    });
    expect(res.port).toBe(8080);
    expect(res.rateLimit.maxRequests).toBe(500);
  });

  it('should fail on invalid enum values', () => {
    expect(() => {
      ConfigSchema.parse({ env: 'invalid-env' });
    }).toThrow(z.ZodError);
  });

  it('should validate nested objects', () => {
    const res = ConfigSchema.parse({
      neo4j: {
        username: 'custom'
      }
    });
    expect(res.neo4j.username).toBe('custom');
    expect(res.neo4j.password).toBe('devpassword'); // default preserved
  });
});
