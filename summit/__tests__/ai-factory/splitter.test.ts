import test from 'node:test';
import assert from 'node:assert';
import { splitPlan } from '../../agents/factory/splitter';

test('splitPlan splits work items', () => {
  const items = splitPlan({ itemSlug: 'x', mws: 'x', workItems: [{ id: '1', title: 't', ownedPaths: [], claimRefs: [] }] });
  assert.strictEqual(items.length, 1);
});
