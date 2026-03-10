import { test } from 'node:test';
import assert from 'node:assert';
import { planSurfaceFromGraph, GraphSnapshot } from '../../packages/graphrag-ui/src/planFromGraph.js';

test('Surface Plan Generation - generates a deterministic surface plan from a graph snapshot', () => {
  const mockSnapshot: GraphSnapshot = {
    snapshotId: 'snap-1234',
    entities: [],
    relationships: []
  };

  const plan = planSurfaceFromGraph(mockSnapshot);

  assert.match(plan.evidenceId, /^APS-surface-plan-\d+$/);
  assert.strictEqual(plan.surfaceSlug, 'investigation-overview');
  assert.strictEqual(plan.graphSnapshotId, 'snap-1234');
  assert.strictEqual(plan.panels.length, 1);
  assert.strictEqual(plan.panels[0].widgets[0].type, 'timeline');

  // Determinism rule check (No random IDs or unstable timestamps directly in plan)
  assert.doesNotMatch(JSON.stringify(plan), /"timestamp"/i);
});
