import { test } from 'node:test';
import assert from 'node:assert';
import { redactSecrets, registerSecret } from '../../../agents/runtime/redaction.js';

test('redaction strips registered secrets', () => {
  registerSecret('MY_SECRET_KEY');
  const result = redactSecrets('Here is the key: MY_SECRET_KEY. Do not share.');
  assert.strictEqual(result, 'Here is the key: [REDACTED]. Do not share.');
});

test('redaction strips known patterns', () => {
  const result = redactSecrets('API Key is sk-12345678901234567890123456789012 and ghp_123456789012345678901234567890123456');
  assert.strictEqual(result, 'API Key is [REDACTED] and [REDACTED]');
});
