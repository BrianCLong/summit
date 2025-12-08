export type NodeId = string;
export type EdgeId = string;

export interface GraphNode {
  id: NodeId;
  type: string;
  label?: string;
  tenantId: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  type: string;
  weight?: number;
  tenantId: string;
  properties: Record<string, unknown>;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type GraphAlgorithmKey =
  | "shortestPath"
  | "kHopNeighborhood"
  | "degreeCentrality"
  | "connectedComponents";

export interface GraphAnalysisJob {
  id: string;
  tenantId: string;
  algorithm: GraphAlgorithmKey;
  params: Record<string, unknown>;
  startTime?: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

export interface ShortestPathParams {
  sourceNodeId: NodeId;
  targetNodeId: NodeId;
  maxDepth?: number;
}

export interface KHopParams {
  sourceNodeId: NodeId;
  k: number;
  direction?: 'in' | 'out' | 'both';
}

export interface DegreeCentralityParams {
  direction?: 'in' | 'out' | 'both';
  topK?: number;
}
