import assert from 'node:assert/strict';
import test from 'node:test';
import { GraphSubgraphClient } from '../src/graphql/subgraphClient.js';

test('GraphSubgraphClient returns data and propagates cost extensions', async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          data: {
            nodeNeighborhood: {
              node: { id: 'n1', labels: ['Test'], properties: { key: 'value' } },
              neighbors: [],
              edges: [],
              pageInfo: { endCursor: null, hasNextPage: false }
            }
          },
          extensions: {
            cost: {
              operations: [
                {
                  operation: 'nodeNeighborhood',
                  source: 'database',
                  metrics: { resultConsumedAfterMs: 42 }
                }
              ]
            }
          }
        };
      }
    });

    const client = new GraphSubgraphClient({ url: 'http://localhost:4003/graphql', logger: { warn: () => {} } });
    const result = await client.fetchNeighborhood({ nodeId: 'n1' });
    assert.equal(result.data.node.id, 'n1');
    assert.equal(result.cost.operations[0].metrics.resultConsumedAfterMs, 42);
  } finally {
    global.fetch = originalFetch;
  }
});
