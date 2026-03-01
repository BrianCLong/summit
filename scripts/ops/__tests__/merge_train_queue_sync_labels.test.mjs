import test from 'node:test';
import assert from 'node:assert/strict';

import { QUEUE_LABELS } from '../merge_train_queue_planner.mjs';
import {
  buildGhArgs,
  buildLabelOperation,
  buildLabelOperations,
  normalizeLabels,
  parseArgs,
  selectOperations,
} from '../merge_train_queue_sync_labels.mjs';

const now = new Date('2026-03-01T00:00:00Z');

test('normalizeLabels handles strings and label objects', () => {
  const labels = normalizeLabels({
    labels: ['prio:P0', { name: 'queue:blocked' }, { missing: 'name' }, null],
  });

  assert.deepEqual(labels, ['prio:P0', 'queue:blocked']);
});

test('buildLabelOperation adds target queue label and removes stale queue labels', () => {
  const operation = buildLabelOperation(
    {
      number: 42,
      title: 'example',
      labels: ['prio:P0', 'queue:blocked', 'queue:needs-rebase'],
    },
    QUEUE_LABELS.mergeNow,
  );

  assert.deepEqual(operation, {
    number: 42,
    title: 'example',
    targetQueueLabel: 'queue:merge-now',
    addLabels: ['queue:merge-now'],
    removeLabels: ['queue:blocked', 'queue:needs-rebase'],
  });
});

test('buildLabelOperation returns null when no queue label change is needed', () => {
  const operation = buildLabelOperation(
    {
      number: 7,
      title: 'already correct',
      labels: ['queue:merge-now', 'prio:P1'],
    },
    QUEUE_LABELS.mergeNow,
  );

  assert.equal(operation, null);
});

test('buildLabelOperations emits deterministic sorted operations and queue metadata', () => {
  const { plan, operations } = buildLabelOperations(
    [
      {
        number: 5,
        title: 'conflict',
        labels: ['queue:merge-now'],
        mergeable: 'CONFLICTING',
        statusCheckRollup: { state: 'SUCCESS' },
        updatedAt: '2026-02-10T00:00:00Z',
      },
      {
        number: 2,
        title: 'merge now',
        labels: ['prio:P0'],
        mergeable: 'MERGEABLE',
        statusCheckRollup: { state: 'SUCCESS' },
        updatedAt: '2026-02-09T00:00:00Z',
      },
    ],
    { now, staleDays: 45, batchSize: 25 },
  );

  assert.equal(plan.queueCounts[QUEUE_LABELS.mergeNow], 1);
  assert.equal(plan.queueCounts[QUEUE_LABELS.conflict], 1);
  assert.deepEqual(
    operations.map((operation) => operation.number),
    [2, 5],
  );
  assert.deepEqual(operations[0].removeLabels, []);
  assert.deepEqual(operations[0].addLabels, ['queue:merge-now']);
  assert.deepEqual(operations[1].removeLabels, ['queue:merge-now']);
  assert.deepEqual(operations[1].addLabels, ['queue:conflict']);
});

test('buildGhArgs includes repo and add/remove flags', () => {
  const args = buildGhArgs(
    {
      number: 99,
      addLabels: ['queue:merge-now'],
      removeLabels: ['queue:blocked', 'queue:conflict'],
    },
    'BrianCLong/summit',
  );

  assert.deepEqual(args, [
    'pr',
    'edit',
    '99',
    '--repo',
    'BrianCLong/summit',
    '--add-label',
    'queue:merge-now',
    '--remove-label',
    'queue:blocked,queue:conflict',
  ]);
});

test('parseArgs defaults to dry-run and parses apply mode', () => {
  const dryRun = parseArgs(['--input', 'open-prs.json']);
  assert.equal(dryRun.apply, false);
  assert.equal(dryRun.input, 'open-prs.json');
  assert.equal(dryRun.limit, 0);
  assert.deepEqual(dryRun.onlyTargets, []);

  const apply = parseArgs([
    '--input',
    'open-prs.json',
    '--apply',
    '--repo',
    'BrianCLong/summit',
    '--limit',
    '10',
    '--only-targets',
    'queue:conflict,queue:needs-rebase',
  ]);
  assert.equal(apply.apply, true);
  assert.equal(apply.repo, 'BrianCLong/summit');
  assert.equal(apply.limit, 10);
  assert.deepEqual(apply.onlyTargets, ['queue:conflict', 'queue:needs-rebase']);
});

test('selectOperations filters by target labels and limit deterministically', () => {
  const operations = [
    { number: 1, targetQueueLabel: 'queue:blocked' },
    { number: 2, targetQueueLabel: 'queue:conflict' },
    { number: 3, targetQueueLabel: 'queue:needs-rebase' },
    { number: 4, targetQueueLabel: 'queue:conflict' },
  ];

  const selected = selectOperations(operations, {
    limit: 1,
    onlyTargets: ['queue:conflict'],
  });

  assert.deepEqual(selected, [{ number: 2, targetQueueLabel: 'queue:conflict' }]);
});
