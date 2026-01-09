import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeWeekEnding, toSlug } from '../stabilization-utils.mjs';

test('normalizeWeekEnding aligns to configured weekday', () => {
  const result = normalizeWeekEnding('2026-01-07T12:00:00Z', 'FRI');
  assert.equal(result, '2026-01-09');
});

test('toSlug normalizes candidate identifiers', () => {
  assert.equal(toSlug('Evidence Compliance'), 'evidence-compliance');
  assert.equal(toSlug('P0 SLA Adherence'), 'p0-sla-adherence');
});
