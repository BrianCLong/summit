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

// Core types
export * from './types';

// Core algorithms
export {
  calculatePageRank,
  calculatePersonalizedPageRank,
  getTopKNodes,
  calculateNodeImportance,
  type PageRankOptions,
  type PageRankResult,
} from './algorithms/pagerank';

export {
  calculateBetweenness,
  findBridgeNodes,
  calculateNetworkVulnerability,
  type BetweennessOptions,
  type BetweennessResult,
} from './algorithms/betweenness';

export {
  calculateClosenessCentrality,
  calculateEigenvectorCentrality,
  calculateCompositeCentrality,
  findMostCentralNodes,
  type ClosenessCentralityOptions,
  type ClosenessCentralityResult,
  type EigenvectorCentralityOptions,
  type EigenvectorCentralityResult,
} from './algorithms/centrality';

export {
  detectCommunitiesLouvain,
  detectCommunitiesLabelPropagation,
  analyzeCommunityStructure,
  type CommunityDetectionResult,
  type LouvainOptions,
  type LabelPropagationOptions,
} from './algorithms/community-detection';

export {
  predictLinks,
  calculateCosineSimilarity,
  findSimilarNodes,
  calculateStructuralEquivalence,
  identifyRoleEquivalence,
  type LinkPredictionResult,
  type SimilarityResult,
  type LinkPredictionOptions,
} from './algorithms/link-prediction';

// Temporal analysis
export {
  analyzeTemporalEvolution,
  analyzeTemporalCentrality,
  analyzeEventSequences,
  type TemporalGraph,
  type TimeWindow,
  type GraphSnapshot,
  type TemporalEvolutionResult,
  type TemporalCentralityResult,
  type EventSequenceResult,
} from './temporal/temporal-analysis';

// Pattern matching
export {
  findSubgraphMatches,
  discoverMotifs,
  detectAnomalousSubgraphs,
  type PatternGraphData,
  type Pattern,
  type MatchResult,
  type MotifResult,
} from './pattern-matching/subgraph-matching';

// Export formats
export {
  exportToGEXF,
  exportToGraphML,
  exportToDOT,
  exportToJSON,
  exportToCSV,
} from './export/export-formats';
