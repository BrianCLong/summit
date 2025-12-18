import test from 'node:test';
import assert from 'node:assert/strict';
import { Watermark } from '../src/core/watermark.js';
import { parseRule } from '../src/core/dsl.js';

test('watermark marks late events after allowed lateness', () => {
  const wm = new Watermark({ allowedLatenessMs: 5000 });
  wm.observe(10_000);
  wm.observe(15_000);
  assert.equal(wm.watermark(), 10_000);
  assert.equal(wm.isLate(4_000), true);
  assert.equal(wm.isLate(12_000), false);
});

test('DSL parses AFTER, WITHIN, EVERY and window', () => {
  const rule = parseRule('EVERY 5s AFTER login WITHIN 30s purchase WINDOW SLIDING 1m 15s WATERMARK 5s');
  assert.equal(rule.everyMs, 5000);
  assert.equal(rule.withinMs, 30000);
  assert.equal(rule.sequence[0].name, 'login');
  assert.equal(rule.window.kind, 'SLIDING');
  assert.equal(rule.window.durationMs, 60000);
  assert.equal(rule.window.slideMs, 15000);
  assert.equal(rule.watermarkMs, 5000);
});
