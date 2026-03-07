import test from 'node:test';
import assert from 'node:assert';
import { redactSecrets } from '../../../agents/runtime/redaction.ts';

test('redactSecrets should remove typical synthetic API keys', () => {
  const content = 'Here is the result. API_KEY=sk-123456789012345678901234567890123456789012345678 and token=1234567890123456789012345678901234567890 is there.';
  const redacted = redactSecrets(content);

  assert.strictEqual(redacted.includes('sk-'), false);
  assert.strictEqual(redacted.includes('[REDACTED_SECRET]'), true);
  // Specifically the 40-char token should be replaced too
  assert.strictEqual(redacted.includes('1234567890123456789012345678901234567890'), false);
});
