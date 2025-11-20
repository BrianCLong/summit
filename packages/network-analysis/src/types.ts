/**
 * Core types for network analysis and graph operations
 */

export interface Node {
  id: string;
  label?: string;
  attributes?: Record<string, any>;
  weight?: number;
}

export interface Edge {
  source: string;
  target: string;
  weight?: number;
  directed?: boolean;
  attributes?: Record<string, any>;
}

export interface Graph {
  nodes: Map<string, Node>;
  edges: Edge[];
  directed: boolean;
  weighted: boolean;
  metadata?: Record<string, any>;
}

export interface NetworkSnapshot {
  timestamp: Date;
  graph: Graph;
  version: string;
}

export interface TemporalNetwork {
  snapshots: NetworkSnapshot[];
  startTime: Date;
  endTime: Date;
}

export interface CentralityScores {
  nodeId: string;
  degree?: number;
  betweenness?: number;
  closeness?: number;
  eigenvector?: number;
  pageRank?: number;
  katz?: number;
  harmonic?: number;
}

export interface Community {
  id: string;
  members: Set<string>;
  modularity?: number;
  density?: number;
  metadata?: Record<string, any>;
}

export interface CommunityStructure {
  communities: Community[];
  algorithm: string;
  modularity: number;
  coverage: number;
}

export interface NetworkMetrics {
  density: number;
  averagePathLength: number;
  clusteringCoefficient: number;
  assortativity: number;
  diameter: number;
  numberOfComponents: number;
  degreeDistribution: Map<number, number>;
}

export interface InfluenceScore {
  nodeId: string;
  influenceValue: number;
  reachability: number;
  spreadProbability: number;
}

export interface DiffusionModel {
  type: 'independent_cascade' | 'linear_threshold' | 'custom';
  parameters: Record<string, any>;
}

export interface PropagationResult {
  seedNodes: Set<string>;
  activatedNodes: Set<string>;
  activationTimes: Map<string, number>;
  cascadeSize: number;
}

export interface LinkPrediction {
  sourceId: string;
  targetId: string;
  score: number;
  method: string;
}

export interface Motif {
  type: string;
  nodes: string[];
  count: number;
  significance?: number;
}

export interface NetworkAnalysisConfig {
  enableCaching?: boolean;
  maxIterations?: number;
  convergenceThreshold?: number;
  parallelization?: boolean;
}

export interface BipartiteGraph {
  leftNodes: Set<string>;
  rightNodes: Set<string>;
  edges: Edge[];
}

export interface HeterogeneousGraph {
  nodeTypes: Map<string, string>;
  edgeTypes: Map<string, string>;
  nodes: Map<string, Node>;
  edges: Edge[];
}

export type GraphLayout = 'force-directed' | 'hierarchical' | 'circular' | 'geographic' | 'timeline';

export interface LayoutConfig {
  type: GraphLayout;
  parameters: Record<string, any>;
}

export interface VisualizationOptions {
  layout: LayoutConfig;
  nodeSize?: (node: Node) => number;
  nodeColor?: (node: Node) => string;
  edgeWidth?: (edge: Edge) => number;
  edgeColor?: (edge: Edge) => string;
  labels?: boolean;
  interactive?: boolean;
}
