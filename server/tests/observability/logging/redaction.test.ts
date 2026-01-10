import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { redact, MASK } from '../../../src/observability/logging/redaction.js';

describe('Logging Redaction', () => {
  it('should redact sensitive keys in object', () => {
    const input = {
      username: 'jdoe',
      password: 'supersecret',
      email: 'jdoe@example.com',
      metadata: {
        api_key: '12345'
      }
    };

    const output = redact(input);

    expect(output.username).toBe('jdoe');
    expect(output.password).toBe(MASK);
    expect(output.metadata.api_key).toBe(MASK);
  });

  it('should redact sensitive keys in nested arrays', () => {
    const input = {
      users: [
        { name: 'A', token: 'abc' },
        { name: 'B', secret: 'xyz' }
      ]
    };

    const output = redact(input);
    expect(output.users[0].token).toBe(MASK);
    expect(output.users[1].secret).toBe(MASK);
  });

  it('should handle null/undefined', () => {
    expect(redact(null)).toBeNull();
    expect(redact(undefined)).toBeUndefined();
  });
});
