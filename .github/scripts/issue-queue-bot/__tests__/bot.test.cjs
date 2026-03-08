const test = require('node:test');
const assert = require('node:assert/strict');

const { buildCommentBody, buildPayload, diffLabels, BOT_MARKER } = require('../bot.cjs');

test('diffLabels adds desired labels and removes stale triage/priority labels', () => {
  const current = ['P0-candidate', 'prio:P1', 'needs-triage'];
  const desired = ['prio:P0', 'queue:deterministic'];
  const { add, remove } = diffLabels(current, desired);

  assert.deepEqual(add.sort(), ['prio:P0', 'queue:deterministic']);
  assert.deepEqual(remove.sort(), ['needs-triage', 'prio:P1']);
});

test('buildCommentBody includes stable marker and JSON payload', () => {
  const payload = buildPayload(
    { number: 11 },
    {
      rulesVersion: 'v1',
      category: 'ci',
      score: 80,
      confidence: 'high',
      queueOrder: 11,
      desiredLabels: ['prio:P0', 'queue:deterministic'],
    },
  );
  const body = buildCommentBody(payload);

  assert.ok(body.includes(BOT_MARKER));
  assert.ok(body.includes('"queue_order": 11'));
  assert.ok(body.includes('"applied_labels"'));
});
