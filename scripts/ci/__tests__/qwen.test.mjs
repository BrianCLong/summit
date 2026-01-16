import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, describe } from 'node:test';
import {
  validateQwenConfig,
  generateCacheKey,
  callQwen,
  makeQwenClient,
  analyzeDocumentWithQwen
} from '../ci/ai-providers/qwen.mjs';

describe('Qwen Client and Cache Integration', () => {
  test('validateQwenConfig succeeds when required env vars are set', () => {
    // Mock environment with required variables
    process.env.DASHSCOPE_API_KEY = 'test-key';
    process.env.QWEN_BASE_URL = 'https://test.example.com';
    process.env.QWEN_MODEL = 'qwen-plus-2025-01-25';

    assert.doesNotThrow(() => validateQwenConfig());
    
    // Clean up
    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.QWEN_BASE_URL;
    delete process.env.QWEN_MODEL;
  });

  test('validateQwenConfig fails without required env vars', () => {
    delete process.env.DASHSCOPE_API_KEY;
    assert.throws(() => validateQwenConfig(), /DASHSCOPE_API_KEY environment variable is required/);
  });

  test('validateQwenConfig rejects unpinned model versions', () => {
    process.env.DASHSCOPE_API_KEY = 'test-key';
    process.env.QWEN_BASE_URL = 'https://test.example.com';
    process.env.QWEN_MODEL = 'qwen-plus-latest';

    assert.throws(() => validateQwenConfig(), /uses unstable version/);
    
    // Clean up
    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.QWEN_BASE_URL;
    delete process.env.QWEN_MODEL;
  });

  test('generateCacheKey produces deterministic output', () => {
    const model = 'test-model';
    const messages = [
      { role: 'user', content: 'Hello world' },
      { role: 'system', content: 'System message' }
    ];
    const params = { temperature: 0 };
    
    const key1 = generateCacheKey(model, messages, params);
    const key2 = generateCacheKey(model, messages, params);
    
    assert.strictEqual(key1, key2, 'Cache key should be identical for identical inputs');
  });

  test('generateCacheKey produces different output for different inputs', () => {
    const model = 'test-model';
    const messages1 = [{ role: 'user', content: 'Hello world' }];
    const messages2 = [{ role: 'user', content: 'Goodbye world' }];
    const params = { temperature: 0 };
    
    const key1 = generateCacheKey(model, messages1, params);
    const key2 = generateCacheKey(model, messages2, params);
    
    assert.notStrictEqual(key1, key2, 'Cache key should be different for different inputs');
  });

  test('makeQwenClient throws without API key', () => {
    delete process.env.DASHSCOPE_API_KEY;
    assert.throws(() => makeQwenClient(), /DASHSCOPE_API_KEY environment variable is required/);
  });
});

// Skip live API tests by default
if (process.env.RUN_LIVE_QWEN_TESTS === 'true') {
  describe('Live Qwen API Tests', () => {
    test('makeQwenClient creates valid client with API key', () => {
      if (!process.env.DASHSCOPE_API_KEY) {
        console.log('Skipping live client test - DASHSCOPE_API_KEY not set');
        return;
      }
      
      const client = makeQwenClient();
      assert.ok(client, 'Client should be created successfully');
    });
  });
}