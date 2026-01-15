import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { explainGraph, Explanation } from '../graph-explainer.js';

const sampleGraph = {
  nodes: [
    { id: 'alpha', type: 'entity' },
    { id: 'beta', type: 'entity' },
  ],
  edges: [{ source: 'alpha', target: 'beta', type: 'link' }],
};

describe('graph-explainer', () => {
  it('loads the module without throwing', () => {
    expect(explainGraph).toBeInstanceOf(Function);
  });

  it('returns explanations for node importance requests', async () => {
    const result = await explainGraph({
      type: 'node_importance',
      graph: sampleGraph,
      query: 'find hubs',
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.kind).toBe('node_importance');
  });

  it('fails open for unsupported types', async () => {
    const result = await explainGraph({
      // @ts-expect-error testing invalid value
      type: 'unsupported',
      graph: sampleGraph,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe('error');
    expect(result[0]?.title).toContain('Explainability unavailable');
  });

  it('is deterministic for the same input', async () => {
    const first = await explainGraph({
      type: 'edge_importance',
      graph: sampleGraph,
      query: 'connectivity',
    });
    const second = await explainGraph({
      type: 'edge_importance',
      graph: sampleGraph,
      query: 'connectivity',
    });

    expect(first).toEqual<Explanation[]>(second);
  });
});
