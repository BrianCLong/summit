import test from 'node:test';
import assert from 'node:assert';
import { Redactor } from '../src/redactor.js';

test('Redactor should redact emails', (t) => {
  const redactor = new Redactor();
  const input = 'Contact me at user@example.com';
  const expected = 'Contact me at [REDACTED]';
  assert.strictEqual(redactor.redact(input), expected);
});

test('Redactor should redact multiple PII', (t) => {
  const redactor = new Redactor();
  const input = 'user@example.com and 123-45-6789';
  const expected = '[REDACTED] and [REDACTED]';
  assert.strictEqual(redactor.redact(input), expected);
});
