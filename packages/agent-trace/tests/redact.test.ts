import test from 'node:test';
import assert from 'node:assert';
import { redactUrl } from '../src/redact.js';

test('redactUrl strips query and fragment', () => {
  const url = 'https://api.cursor.com/v1/conversations/12345?token=secret#part1';
  const result = redactUrl(url);
  assert.strictEqual(result.redactedUrl, 'https://api.cursor.com/v1/conversations/12345');
  assert.ok(result.urlHash.length > 0);
});

test('redactUrl with allowlist', () => {
  const url = 'https://api.example.com/v1';
  const result = redactUrl(url, ['api.cursor.com']);
  assert.strictEqual(result.redactedUrl, 'redacted://hidden');
});

test('redactUrl with allowed domain', () => {
  const url = 'https://api.cursor.com/v1';
  const result = redactUrl(url, ['api.cursor.com']);
  assert.strictEqual(result.redactedUrl, 'https://api.cursor.com/v1');
});
