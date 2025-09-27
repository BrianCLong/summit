import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDiff, formatCiReport, loadFixture } from '../dist/index.js';

const FIXTURE_NAME = 'mixed-prompts.json';

async function getFixture() {
  return loadFixture(FIXTURE_NAME);
}

test('PII never appears in sanitized prompts or diffs', async () => {
  const fixture = await getFixture();
  const diff = computeDiff(fixture.previous, fixture.next);

  const rawValues = ['jane.doe@example.com', '303-555-0199', '+1 (720) 555-0111'];
  for (const value of rawValues) {
    assert.ok(!diff.sanitizedPrevious.includes(value), `previous content leaked ${value}`);
    assert.ok(!diff.sanitizedNext.includes(value), `next content leaked ${value}`);
    for (const change of diff.changes) {
      assert.ok(!change.value.includes(value), `diff change leaked ${value}`);
    }
  }

  assert.ok(diff.redactions.length >= rawValues.length, 'expected redaction records');
});

test('semantic diffs detect context changes with risk annotations', async () => {
  const fixture = await getFixture();
  const diff = computeDiff(fixture.previous, fixture.next);

  assert.ok(diff.summary.semanticChanges > 0, 'expected semantic changes to be detected');
  assert.ok(diff.changes.some((change) => change.type === 'add'), 'expected additions present');
  assert.ok(diff.summary.annotations.some((note) => note.code === 'new-sensitive-span'));
  assert.match(diff.summary.riskLevel, /low|medium|high/);
});

test('CI formatter output remains stable across invocations', async () => {
  const fixture = await getFixture();
  const diff = computeDiff(fixture.previous, fixture.next);
  const first = formatCiReport(diff);
  const second = formatCiReport(diff);

  assert.strictEqual(first, second, 'formatter output should be deterministic');
  assert.ok(first.includes('PFPT Semantic Diff'), 'formatter should include banner');
});
