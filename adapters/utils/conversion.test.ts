import test from 'node:test';
import assert from 'node:assert';
import { formatEvents, convertMetrics } from './conversion.ts';

test('formatEvents', () => {
  const events = [{ data: 'test' }];
  const formatted = formatEvents(events);
  assert.strictEqual(formatted.length, 1);
  assert.strictEqual(formatted[0].data, 'test');
  assert.strictEqual(formatted[0]._formatted, true);
});

test('convertMetrics', () => {
  const metrics = { invocations: 5 };
  const converted = convertMetrics(metrics);
  assert.strictEqual(converted.invocations, 5);
  assert.strictEqual(converted._converted, true);
});
