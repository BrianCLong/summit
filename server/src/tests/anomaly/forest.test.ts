import { score } from '../../anomaly/forest';
import type { Neo4jGraph } from '../../anomaly/forest';

describe('isolation forest graph scoring', () => {
  it('detects high-degree nodes as anomalies', () => {
    const graph: Neo4jGraph = {
      nodes: [
        { id: 'hub', tags: ['core'] },
        { id: 'n1' },
        { id: 'n2' },
        { id: 'n3' },
        { id: 'n4' },
      ],
      edges: [
        { source: 'hub', target: 'n1' },
        { source: 'hub', target: 'n2' },
        { source: 'hub', target: 'n3' },
        { source: 'hub', target: 'n4' },
        { source: 'n1', target: 'n2' },
        { source: 'n2', target: 'n3' },
      ],
    };

    const result = score(graph);
    const hub = result.nodes.find((node) => node.id === 'hub');

    expect(result.summary.totalNodes).toBe(5);
    expect(result.summary.totalEdges).toBeCloseTo(6);
    expect(result.summary.anomalyCount).toBeGreaterThanOrEqual(1);
    expect(hub?.isAnomaly).toBe(true);
    expect(hub?.score).toBeGreaterThanOrEqual(result.summary.threshold);
  });
});
