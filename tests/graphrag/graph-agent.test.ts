import { test } from 'node:test';
import * as assert from 'node:assert';
import { GraphAgent } from '../../src/graphrag/inference/graph-agent';

test('GraphAgent infers correctly', () => {
  const agent = new GraphAgent();
  const res = agent.infer('node-1');
  assert.strictEqual(res, 'Inferred from node-1');
});
