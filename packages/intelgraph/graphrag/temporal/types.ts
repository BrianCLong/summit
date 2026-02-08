export interface TemporalEdge {
  v1: string; // Source node ID
  v2: string; // Target node ID
  rel: string; // Relation type
  timestamp: string; // ISO 8601 or similar representation
  embeddingId?: string; // Reference to relation embedding
  chunkIds: string[]; // Chunks supporting this fact
}

export type Granularity = 'year' | 'month' | 'day' | 'hour';

export interface TimeNode {
  id: string;
  granularity: Granularity;
  start: string;
  end: string;
  parentId?: string;
  childIds: string[];
}

export interface Chunk {
  chunkId: string;
  text: string;
  tokenCount: number;
  edgeIds: string[];
}

export interface TimeScope {
  start: Date;
  end: Date;
  raw?: string;
}

export interface TGRAGConfig {
  topKEdges: number;
  pprIterations: number;
  pprEpsilon: number;
  tokenBudget: number;
  alpha: number; // PPR damping factor
}
