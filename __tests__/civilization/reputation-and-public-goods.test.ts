import { test } from 'node:test';
import * as assert from 'node:assert';
import { CivilizationGraph } from '../../graph/civilization/CivilizationGraph.js';

test('CivilizationGraph adds edge', () => {
  const graph = new CivilizationGraph();
  graph.addEdge({ type: 'CONTRACTED_WITH', from: 'a1', to: 'a2' });
  assert.strictEqual(graph.edges.length, 1);
});
