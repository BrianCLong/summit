/**
 * @intelgraph/graph-analytics
 *
 * Advanced Graph Analytics Engine for Intelligence Analysis
 *
 * Provides production-grade graph algorithms including:
 * - Centrality measures (PageRank, Betweenness, Closeness, Eigenvector)
 * - Community detection (Louvain, Label Propagation)
 * - Link prediction and similarity scoring
 * - Temporal graph analysis
 * - Pattern matching and motif discovery
 * - Graph export to multiple formats
 */

// Core algorithms
export * from './algorithms/pagerank';
export * from './algorithms/betweenness';
export * from './algorithms/centrality';
export * from './algorithms/community-detection';
export * from './algorithms/link-prediction';

// Temporal analysis
export * from './temporal/temporal-analysis';

// Pattern matching
export * from './pattern-matching/subgraph-matching';

// Export formats
export * from './export/export-formats';

// Re-export common types
export interface GraphData {
  nodes: string[];
  edges: { source: string; target: string; weight?: number }[];
}
