/**
 * Subgraph Matching and Pattern Discovery
 *
 * Implements subgraph isomorphism and motif discovery for intelligence analysis.
 * Critical for identifying operational patterns, organizational structures,
 * and anomalous configurations.
 *
 * @module pattern-matching/subgraph-matching
 */

export interface GraphData {
  nodes: string[];
  edges: { source: string; target: string; type?: string; weight?: number }[];
}

export interface Pattern {
  nodes: string[];
  edges: { source: string; target: string; type?: string }[];
}

export interface MatchResult {
  matches: Array<{
    mapping: Map<string, string>; // pattern node -> graph node
    nodes: string[];
    edges: Array<{ source: string; target: string }>;
  }>;
  count: number;
  executionTime: number;
}

export interface MotifResult {
  motifs: Array<{
    id: string;
    pattern: Pattern;
    frequency: number;
    significance: number; // z-score compared to random graphs
  }>;
  executionTime: number;
}

/**
 * Finds all occurrences of a pattern in the graph (subgraph isomorphism)
 *
 * @param graph - Target graph to search
 * @param pattern - Pattern to find
 * @param options - Search options
 * @returns Match results
 */
export function findSubgraphMatches(
  graph: GraphData,
  pattern: Pattern,
  options: {
    maxMatches?: number;
    exactMatch?: boolean; // require exact edge types
  } = {},
): MatchResult {
  const startTime = performance.now();

  const { maxMatches = 1000, exactMatch = false } = options;

  // Build adjacency structures
  const graphAdj = buildAdjacency(graph);
  const patternAdj = buildAdjacency(pattern);

  const matches: Array<{
    mapping: Map<string, string>;
    nodes: string[];
    edges: Array<{ source: string; target: string }>;
  }> = [];

  // VF2 Algorithm (simplified version)
  const mapping = new Map<string, string>(); // pattern -> graph
  const reverseMapping = new Map<string, string>(); // graph -> pattern

  function backtrack(patternNodeIndex: number): void {
    if (matches.length >= maxMatches) return;

    // All pattern nodes mapped - found a match
    if (patternNodeIndex >= pattern.nodes.length) {
      const matchNodes = pattern.nodes.map((pn) => mapping.get(pn)!);
      const matchEdges = pattern.edges
        .map((e) => ({
          source: mapping.get(e.source)!,
          target: mapping.get(e.target)!,
        }))
        .filter((e) => e.source && e.target);

      matches.push({
        mapping: new Map(mapping),
        nodes: matchNodes,
        edges: matchEdges,
      });
      return;
    }

    const patternNode = pattern.nodes[patternNodeIndex];
    const patternNeighbors = patternAdj.get(patternNode) || new Set();

    // Try mapping to each graph node
    for (const graphNode of graph.nodes) {
      // Skip if already mapped
      if (reverseMapping.has(graphNode)) continue;

      // Check degree compatibility
      const graphNeighbors = graphAdj.get(graphNode) || new Set();
      if (graphNeighbors.size < patternNeighbors.size) continue;

      // Check consistency with existing mapping
      let consistent = true;
      for (const [mappedPattern, mappedGraph] of mapping) {
        const shouldBeConnectedInPattern = patternAdj.get(patternNode)?.has(mappedPattern);
        const isConnectedInGraph = graphAdj.get(graphNode)?.has(mappedGraph);

        if (shouldBeConnectedInPattern !== isConnectedInGraph) {
          consistent = false;
          break;
        }
      }

      if (!consistent) continue;

      // Add mapping and recurse
      mapping.set(patternNode, graphNode);
      reverseMapping.set(graphNode, patternNode);

      backtrack(patternNodeIndex + 1);

      // Backtrack
      mapping.delete(patternNode);
      reverseMapping.delete(graphNode);
    }
  }

  backtrack(0);

  const executionTime = performance.now() - startTime;

  return {
    matches,
    count: matches.length,
    executionTime,
  };
}

/**
 * Discovers common motifs (recurring patterns) in the graph
 *
 * @param graph - Graph to analyze
 * @param options - Discovery options
 * @returns Discovered motifs
 */
export function discoverMotifs(
  graph: GraphData,
  options: {
    motifSize?: number; // number of nodes in motif
    minFrequency?: number;
    sampleSize?: number;
  } = {},
): MotifResult {
  const startTime = performance.now();

  const { motifSize = 3, minFrequency = 3, sampleSize = 100 } = options;

  // For 3-node motifs, enumerate all possible patterns
  const motifCounts = new Map<string, number>();
  const motifExamples = new Map<string, Pattern>();

  // Sample random node triples
  for (let i = 0; i < sampleSize; i++) {
    const nodes = sampleRandomNodes(graph.nodes, motifSize);
    const subgraph = extractSubgraph(graph, nodes);

    // Canonicalize the subgraph pattern
    const canonical = canonicalizePattern(subgraph);
    motifCounts.set(canonical, (motifCounts.get(canonical) || 0) + 1);

    if (!motifExamples.has(canonical)) {
      motifExamples.set(canonical, subgraph);
    }
  }

  // Filter by frequency and calculate significance
  const motifs: Array<{
    id: string;
    pattern: Pattern;
    frequency: number;
    significance: number;
  }> = [];

  for (const [canonical, frequency] of motifCounts) {
    if (frequency >= minFrequency) {
      const pattern = motifExamples.get(canonical)!;
      // Simple significance: frequency normalized by sample size
      const significance = frequency / sampleSize;

      motifs.push({
        id: canonical,
        pattern,
        frequency,
        significance,
      });
    }
  }

  // Sort by frequency
  motifs.sort((a, b) => b.frequency - a.frequency);

  const executionTime = performance.now() - startTime;

  return {
    motifs,
    executionTime,
  };
}

/**
 * Detects anomalous subgraphs that deviate from normal patterns
 */
export function detectAnomalousSubgraphs(
  graph: GraphData,
  options: {
    subgraphSize?: number;
    numSamples?: number;
    threshold?: number; // z-score threshold
  } = {},
): Array<{
  nodes: string[];
  anomalyScore: number;
  reasons: string[];
}> {
  const { subgraphSize = 4, numSamples = 50, threshold = 2.0 } = options;

  // Calculate graph statistics
  const degrees = new Map<string, number>();
  const adjacency = buildAdjacency(graph);

  for (const [node, neighbors] of adjacency) {
    degrees.set(node, neighbors.size);
  }

  const avgDegree =
    Array.from(degrees.values()).reduce((sum, d) => sum + d, 0) / degrees.size;
  const degreeStdDev = Math.sqrt(
    Array.from(degrees.values()).reduce(
      (sum, d) => sum + Math.pow(d - avgDegree, 2),
      0,
    ) / degrees.size,
  );

  const anomalies: Array<{
    nodes: string[];
    anomalyScore: number;
    reasons: string[];
  }> = [];

  // Sample subgraphs and check for anomalies
  for (let i = 0; i < numSamples; i++) {
    const nodes = sampleRandomNodes(graph.nodes, subgraphSize);
    const subgraph = extractSubgraph(graph, nodes);

    const reasons: string[] = [];
    let anomalyScore = 0;

    // Check degree anomalies
    for (const node of nodes) {
      const degree = degrees.get(node) || 0;
      const zScore = (degree - avgDegree) / (degreeStdDev || 1);

      if (Math.abs(zScore) > threshold) {
        reasons.push(`Node ${node} has unusual degree: ${degree} (z=${zScore.toFixed(2)})`);
        anomalyScore += Math.abs(zScore);
      }
    }

    // Check density anomaly
    const subgraphDensity = calculateDensity(subgraph);
    const expectedDensity = (2 * graph.edges.length) / (graph.nodes.length * (graph.nodes.length - 1));
    const densityRatio = subgraphDensity / (expectedDensity || 0.01);

    if (densityRatio > 3) {
      reasons.push(`Unusually dense subgraph: ${(subgraphDensity * 100).toFixed(1)}%`);
      anomalyScore += densityRatio;
    } else if (densityRatio < 0.3 && subgraphDensity < expectedDensity) {
      reasons.push(`Unusually sparse subgraph: ${(subgraphDensity * 100).toFixed(1)}%`);
      anomalyScore += 1 / densityRatio;
    }

    if (anomalyScore > threshold && reasons.length > 0) {
      anomalies.push({ nodes, anomalyScore, reasons });
    }
  }

  // Sort by anomaly score
  anomalies.sort((a, b) => b.anomalyScore - a.anomalyScore);

  return anomalies.slice(0, 20);
}

// Helper functions

function buildAdjacency(graph: GraphData | Pattern): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();

  for (const node of graph.nodes) {
    adjacency.set(node, new Set());
  }

  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  return adjacency;
}

function sampleRandomNodes(nodes: string[], k: number): string[] {
  const shuffled = [...nodes];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(k, nodes.length));
}

function extractSubgraph(graph: GraphData, nodes: string[]): Pattern {
  const nodeSet = new Set(nodes);
  const edges = graph.edges.filter(
    (e) => nodeSet.has(e.source) && nodeSet.has(e.target),
  );

  return {
    nodes,
    edges: edges.map((e) => ({
      source: e.source,
      target: e.target,
      type: e.type,
    })),
  };
}

function canonicalizePattern(pattern: Pattern): string {
  // Create canonical string representation
  // Sort nodes and edges for consistent representation
  const sortedNodes = [...pattern.nodes].sort();
  const sortedEdges = [...pattern.edges]
    .map((e) => {
      const [a, b] = [e.source, e.target].sort();
      return `${a}-${b}`;
    })
    .sort();

  return `N:${sortedNodes.join(',')}|E:${sortedEdges.join(',')}`;
}

function calculateDensity(pattern: Pattern): number {
  const n = pattern.nodes.length;
  if (n < 2) return 0;
  const maxEdges = (n * (n - 1)) / 2;
  return pattern.edges.length / maxEdges;
}
