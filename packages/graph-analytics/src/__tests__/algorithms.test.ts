/**
 * Graph Analytics Algorithm Tests
 */

import {
  calculatePageRank,
  calculateBetweenness,
  calculateClosenessCentrality,
  calculateEigenvectorCentrality,
  detectCommunitiesLouvain,
  detectCommunitiesLabelPropagation,
  predictLinks,
  findSubgraphMatches,
  discoverMotifs,
  exportToGEXF,
  exportToGraphML,
  exportToDOT,
  exportToJSON,
} from '../index';

// Test graph: simple triangle with one dangling node
const testGraph = {
  nodes: ['A', 'B', 'C', 'D'],
  edges: [
    { source: 'A', target: 'B', weight: 1 },
    { source: 'B', target: 'C', weight: 1 },
    { source: 'C', target: 'A', weight: 1 },
    { source: 'D', target: 'C', weight: 1 },
  ],
};

describe('PageRank', () => {
  it('should compute PageRank for all nodes', () => {
    const result = calculatePageRank(testGraph);

    expect(result.ranks.size).toBe(4);
    expect(result.converged).toBe(true);
    expect(result.iterations).toBeGreaterThan(0);

    // All ranks should sum to ~1
    const sum = Array.from(result.ranks.values()).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 2);
  });

  it('should handle empty graph', () => {
    const result = calculatePageRank({ nodes: [], edges: [] });
    expect(result.ranks.size).toBe(0);
    expect(result.converged).toBe(true);
  });
});

describe('Betweenness Centrality', () => {
  it('should compute betweenness for all nodes', () => {
    const result = calculateBetweenness(testGraph);

    expect(result.nodeBetweenness.size).toBe(4);
    expect(result.normalized).toBe(true);

    // Node C should have highest betweenness (bridge between D and triangle)
    const cScore = result.nodeBetweenness.get('C') || 0;
    const dScore = result.nodeBetweenness.get('D') || 0;
    expect(cScore).toBeGreaterThan(dScore);
  });
});

describe('Closeness Centrality', () => {
  it('should compute closeness for all nodes', () => {
    const result = calculateClosenessCentrality(testGraph);

    expect(result.closeness.size).toBe(4);
    expect(result.avgCloseness).toBeGreaterThan(0);
  });
});

describe('Eigenvector Centrality', () => {
  it('should compute eigenvector centrality', () => {
    const result = calculateEigenvectorCentrality(testGraph);

    expect(result.centrality.size).toBe(4);
    expect(result.converged).toBe(true);
  });
});

describe('Community Detection', () => {
  it('should detect communities using Louvain', () => {
    const result = detectCommunitiesLouvain(testGraph);

    expect(result.communities.size).toBe(4);
    expect(result.numCommunities).toBeGreaterThan(0);
    expect(result.modularity).toBeGreaterThanOrEqual(-0.5);
    expect(result.modularity).toBeLessThanOrEqual(1);
  });

  it('should detect communities using Label Propagation', () => {
    const result = detectCommunitiesLabelPropagation(testGraph);

    expect(result.communities.size).toBe(4);
    expect(result.numCommunities).toBeGreaterThan(0);
  });
});

describe('Link Prediction', () => {
  it('should predict potential links', () => {
    const result = predictLinks(testGraph, {
      methods: ['common-neighbors', 'jaccard'],
      topK: 10,
    });

    expect(result.predictions.length).toBeGreaterThanOrEqual(0);
  });
});

describe('Pattern Matching', () => {
  it('should find subgraph matches', () => {
    // Look for a simple edge pattern
    const pattern = {
      nodes: ['X', 'Y'],
      edges: [{ source: 'X', target: 'Y' }],
    };

    const result = findSubgraphMatches(testGraph, pattern);
    expect(result.count).toBeGreaterThan(0);
  });

  it('should discover motifs', () => {
    const result = discoverMotifs(testGraph, {
      motifSize: 3,
      minFrequency: 1,
      sampleSize: 10,
    });

    expect(result.motifs).toBeDefined();
  });
});

describe('Export Formats', () => {
  const exportGraph = {
    nodes: [
      { id: 'A', label: 'Node A', properties: { type: 'entity' } },
      { id: 'B', label: 'Node B', properties: { type: 'person' } },
    ],
    edges: [{ source: 'A', target: 'B', weight: 1.5, label: 'knows' }],
    metadata: { title: 'Test Graph', directed: false },
  };

  it('should export to GEXF', () => {
    const gexf = exportToGEXF(exportGraph);
    expect(gexf).toContain('<?xml');
    expect(gexf).toContain('<gexf');
    expect(gexf).toContain('Node A');
  });

  it('should export to GraphML', () => {
    const graphml = exportToGraphML(exportGraph);
    expect(graphml).toContain('<?xml');
    expect(graphml).toContain('<graphml');
  });

  it('should export to DOT', () => {
    const dot = exportToDOT(exportGraph);
    expect(dot).toContain('graph G');
    expect(dot).toContain('--');
  });

  it('should export to JSON', () => {
    const json = exportToJSON(exportGraph);
    const parsed = JSON.parse(json);
    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.links).toHaveLength(1);
  });
});
