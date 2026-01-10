import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { generateJobKey } from '../jobKeys.js';
import { createHash } from 'crypto';

describe('generateJobKey', () => {
  const jobType = 'receipt-ingestion';
  const idempotencyKey = '123e4567-e89b-12d3-a456-426614174000';

  it('should return undefined when feature is disabled', () => {
    const key = generateJobKey(jobType, idempotencyKey, false);
    expect(key).toBeUndefined();
  });

  it('should return a deterministic key when feature is enabled', () => {
    const key1 = generateJobKey(jobType, idempotencyKey, true);
    const key2 = generateJobKey(jobType, idempotencyKey, true);

    expect(key1).toBeDefined();
    expect(key1).toBe(key2);

    // Verify structure
    const expectedHash = createHash('sha256')
      .update(`${jobType}:${idempotencyKey}`)
      .digest('hex');
    expect(key1).toBe(`${jobType}:${expectedHash}`);
  });

  it('should return different keys for different inputs', () => {
    const key1 = generateJobKey(jobType, 'key1', true);
    const key2 = generateJobKey(jobType, 'key2', true);
    const key3 = generateJobKey('other-type', 'key1', true);

    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
  });
});
