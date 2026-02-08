import { EvidenceChunk } from '../types/index.js';

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, any>;
  saliency?: number;
}

export interface GraphEdge {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  properties?: Record<string, any>;
  weight?: number;
}

export interface Kg2RagParams {
  maxHops?: number;
  maxNodes?: number;
  maxEdges?: number;
  tenantId: string;
  query: string;
}

export interface Kg2RagSeed {
  query: string;
  seedChunks: EvidenceChunk[];
  seedNodes: GraphNode[];
}

export interface Kg2RagSubgraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated: boolean;
}

export interface RetrievalContext {
  paragraphs: string[];
  provenance: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  debug?: any;
}
