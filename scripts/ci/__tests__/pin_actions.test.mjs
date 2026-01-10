import assert from 'node:assert/strict';
import test from 'node:test';

import { pinWorkflowText } from '../pin_actions.mjs';

test('rewrites floating refs to pinned SHAs using injected resolver (no network)', async () => {
  const input = `
name: Example
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Node
        uses: actions/setup-node@main
      - name: Local ok
        uses: ./.github/actions/local
`.trimStart();

  const fake = async ({ owner, repo, ref }) => {
    const key = `${owner}/${repo}@${ref}`;
    if (key === 'actions/checkout@v4') {
      return '0123456789abcdef0123456789abcdef01234567';
    }
    if (key === 'actions/setup-node@main') {
      return 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    }
    throw new Error(`unexpected: ${key}`);
  };

  const result = await pinWorkflowText({
    text: input,
    fileRelPath: '.github/workflows/example.yml',
    resolveToSha: fake
  });

  assert.equal(result.changed, true);
  assert.ok(
    result.rewrittenText.includes(
      'actions/checkout@0123456789abcdef0123456789abcdef01234567'
    )
  );
  assert.ok(
    result.rewrittenText.includes(
      'actions/setup-node@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    )
  );
  assert.ok(result.rewrittenText.includes('uses: ./.github/actions/local'));
});
