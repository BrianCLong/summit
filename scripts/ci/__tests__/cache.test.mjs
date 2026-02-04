import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import cache from '../ai-providers/cache.mjs';

describe('AI Response Cache', () => {
  test('cache generates deterministic keys', () => {
    const model = 'test-model';
    const messages1 = [
      { role: 'user', content: 'Hello world' },
      { role: 'system', content: 'System message' }
    ];
    const params = { temperature: 0 };
    
    const key1 = cache.generateKey(model, messages1, params);
    const key2 = cache.generateKey(model, messages1, params);
    
    assert.strictEqual(key1, key2, 'Cache key should be identical for identical inputs');
  });

  test('cache generates different keys for different inputs', () => {
    const model = 'test-model';
    const messages1 = [{ role: 'user', content: 'Hello world' }];
    const messages2 = [{ role: 'user', content: 'Goodbye world' }];
    const params = { temperature: 0 };
    
    const key1 = cache.generateKey(model, messages1, params);
    const key2 = cache.generateKey(model, messages2, params);
    
    assert.notStrictEqual(key1, key2, 'Cache key should be different for different inputs');
  });

  test('cache stores and retrieves values', async () => {
    // Clear cache for test
    await cache.clear();
    
    const testKey = 'test-key';
    const testValue = { response: 'test response', status: 'success' };
    
    await cache.put(testKey, testValue);
    const retrieved = await cache.get(testKey);
    
    assert.deepStrictEqual(retrieved, testValue, 'Retrieved value should match stored value');
  });

  test('cache returns null or undefined for non-existent keys', async () => {
    const nonExistentKey = 'non-existent-key';
    const result = await cache.get(nonExistentKey);

    assert.ok(result === null || result === undefined, 'Should return null or undefined for non-existent key');
  });
});