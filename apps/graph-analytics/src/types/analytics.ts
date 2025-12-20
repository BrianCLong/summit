/**
 * Enhanced Graph Analytics Types
 *
 * This module defines comprehensive types for graph analytics operations including
 * pathfinding, community detection, centrality metrics, and pattern/motif detection.
 */

// ============================================================================
// Core Graph Types
// ============================================================================

export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
  degree?: number;
  centrality?: {
    betweenness: number;
    closeness: number;
    eigenvector: number;
    pagerank: number;
  };
  clustering?: number;
  community?: string;
}

export interface GraphEdge {
  id: string;
  fromId: string;
  toId: string;
  type: string;
  properties: Record<string, any>;
  weight?: number;
  direction?: 'directed' | 'undirected';
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ============================================================================
// Path Analysis Types
// ============================================================================

export interface PathQueryConstraints {
  maxDepth?: number;
  disallowedNodeLabels?: string[];
  disallowedEdgeTypes?: string[];
  requiredNodeLabels?: string[];
  requiredEdgeTypes?: string[];
  weightProperty?: string;
  direction?: 'OUTGOING' | 'INCOMING' | 'BOTH';
}

export interface Path {
  nodeIds: string[];
  edgeIds: string[];
  length: number;
  weight?: number;
  relationships: string[];
}

export interface PathResult {
  source: string;
  target: string;
  paths: Path[];
  shortestPath?: Path;
  explanation: string;
  stats: {
    totalPaths: number;
    averageLength: number;
    minLength: number;
    maxLength: number;
    policyFilteredNodes: number;
    policyFilteredEdges: number;
  };
}

export type NodePolicyFilter = (node: GraphNode) => boolean;
export type EdgePolicyFilter = (edge: GraphEdge) => boolean;

// ============================================================================
// Community Detection Types
// ============================================================================

export interface CommunityResult {
  nodeId: string;
  communityId: string;
}

export interface CommunitySummary {
  communities: CommunityResult[];
  numCommunities: number;
  modularityScore?: number;
  sizes: Record<string, number>;
  densities: Record<string, number>;
}

export interface CommunityAnalysisResult {
  communities: CommunitySummary;
  explanation: string;
  algorithm: string;
  parameters: Record<string, any>;
}

// ============================================================================
// Centrality Types
// ============================================================================

export interface CentralityScores {
  degree: Record<string, number>;
  betweenness: Record<string, number>;
  eigenvector?: Record<string, number>;
  closeness?: Record<string, number>;
}

export interface CentralityResult {
  scores: CentralityScores;
  summaries: {
    topByDegree: string[];
    topByBetweenness: string[];
    topByEigenvector?: string[];
    topByCloseness?: string[];
  };
  stats: {
    avgDegree: number;
    maxDegree: number;
    avgBetweenness: number;
    maxBetweenness: number;
  };
}

export interface CentralityAnalysisResult {
  centrality: CentralityResult;
  explanation: string;
  algorithm: string;
}

// ============================================================================
// Pattern/Motif Detection Types
// ============================================================================

export interface PatternInstance {
  patternType: string;
  nodes: string[];
  edges: string[];
  metrics?: Record<string, number>;
  summary: string;
}

export interface PatternMineResult {
  patterns: PatternInstance[];
}

export interface PatternAnalysisResult {
  patterns: PatternInstance[];
  explanation: string;
  stats: {
    totalPatterns: number;
    byType: Record<string, number>;
  };
}

export interface StarPatternParams {
  minDegree: number;
  nodeLabels?: string[];
  edgeTypes?: string[];
}

export interface BipartitePatternParams {
  minSources: number;
  minTargets: number;
  edgeTypeFilter?: string;
  sourceLabels?: string[];
  targetLabels?: string[];
}

export interface RepeatedInteractionParams {
  minInteractions: number;
  minParticipants: number;
  timeWindowSeconds?: number;
  edgeTypes?: string[];
}

export interface PatternMinerParams {
  star?: StarPatternParams;
  bipartiteFan?: BipartitePatternParams;
  repeatedInteractions?: RepeatedInteractionParams;
}

// ============================================================================
// Graph Repository Abstraction
// ============================================================================

export interface SubgraphQuery {
  nodeIds?: string[];
  edgeTypes?: string[];
  depth?: number;
  limit?: number;
  filters?: Record<string, any>;
}

export interface GraphRepository {
  getSubgraph(params: SubgraphQuery): Promise<Graph>;
  getNeighbors(
    nodeId: string,
    depth: number,
    filters?: Record<string, any>,
  ): Promise<Graph>;
}

// ============================================================================
// Analysis Request/Response Types
// ============================================================================

export interface AnalysisMetadata {
  algorithm: string;
  parameters: Record<string, any>;
  executionTimeMs: number;
  timestamp: Date;
  cacheHit?: boolean;
}

export interface BaseAnalysisResult {
  metadata: AnalysisMetadata;
  explanation: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  avgDegree: number;
  components: number;
  diameter?: number;
  clustering: number;
}

export interface TemporalSnapshot {
  timestamp: Date;
  nodeCount: number;
  edgeCount: number;
  density: number;
  components: number;
  newNodes: string[];
  removedNodes: string[];
  newEdges: string[];
  removedEdges: string[];
}

export interface TemporalTrends {
  growth: 'increasing' | 'decreasing' | 'stable';
  volatility: number;
  periodicity?: number;
}

export interface TemporalAnalysisResult {
  timeframe: { start: Date; end: Date };
  snapshots: TemporalSnapshot[];
  trends: TemporalTrends;
  explanation: string;
}
