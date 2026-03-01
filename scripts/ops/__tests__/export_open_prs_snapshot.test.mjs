import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGraphqlArgs,
  mapNodeToSnapshot,
  parseArgs,
} from '../export_open_prs_snapshot.mjs';

test('parseArgs validates required flags and defaults', () => {
  const args = parseArgs(['--owner', 'BrianCLong', '--repo', 'summit']);

  assert.equal(args.owner, 'BrianCLong');
  assert.equal(args.repo, 'summit');
  assert.equal(args.pageSize, 25);
  assert.equal(args.maxPrs, 1000);
  assert.equal(args.retries, 3);
});

test('buildGraphqlArgs includes cursor only when provided', () => {
  const withoutCursor = buildGraphqlArgs({
    owner: 'BrianCLong',
    repo: 'summit',
    pageSize: 25,
    cursor: '',
  });
  assert.equal(withoutCursor.includes('after='), false);

  const withCursor = buildGraphqlArgs({
    owner: 'BrianCLong',
    repo: 'summit',
    pageSize: 25,
    cursor: 'abc123',
  });
  assert.equal(withCursor.includes('after=abc123'), true);
});

test('mapNodeToSnapshot flattens graph response into planner-compatible shape', () => {
  const snapshot = mapNodeToSnapshot({
    number: 18888,
    title: 'merge train test',
    mergeable: 'MERGEABLE',
    mergeStateStatus: 'CLEAN',
    updatedAt: '2026-03-01T00:00:00Z',
    reviewDecision: 'APPROVED',
    isDraft: false,
    baseRefName: 'main',
    labels: { nodes: [{ name: 'prio:P0' }, { name: 'queue:merge-now' }] },
    statusCheckRollup: { state: 'SUCCESS' },
    assignees: { nodes: [{ login: 'octocat' }] },
  });

  assert.deepEqual(snapshot, {
    number: 18888,
    title: 'merge train test',
    mergeable: 'MERGEABLE',
    mergeStateStatus: 'CLEAN',
    updatedAt: '2026-03-01T00:00:00Z',
    reviewDecision: 'APPROVED',
    isDraft: false,
    baseRefName: 'main',
    labels: ['prio:P0', 'queue:merge-now'],
    statusCheckRollup: { state: 'SUCCESS' },
    assignees: [{ login: 'octocat' }],
  });
});
