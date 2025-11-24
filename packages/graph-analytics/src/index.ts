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
 * - Pathfinding with policy awareness (Shortest Path, K-Shortest Paths)
 * - Pattern mining templates (Co-travel, Financial Structuring, Communication Bursts)
 * - XAI-integrated explanations for all analytics
 * - Graph export to multiple formats
 */

// Core algorithms
export * from './algorithms/pagerank';
export * from './algorithms/betweenness';
export * from './algorithms/centrality';
export * from './algorithms/community-detection';
export * from './algorithms/link-prediction';
export * from './algorithms/pathfinding';

// Temporal analysis
export * from './temporal/temporal-analysis';

// Pattern matching
export * from './pattern-matching/subgraph-matching';

// Pattern mining templates
export * from './pattern-mining/pattern-templates';

// Export formats
export * from './export/export-formats';

// Re-export common types
export interface GraphData {
  nodes: string[];
  edges: { source: string; target: string; weight?: number }[];
}
