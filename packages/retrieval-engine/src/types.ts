export type RetrievalBackend = "local_stub" | "neptune_graphrag" | "tigergraph_hybrid" | "zero_etl_view";

export interface RetrievalPlan {
  query: {
    text: string;
    embedding?: {
      model: string;
      vector?: number[];
    }
  };
  constraints?: {
    graphPattern?: string;
    filters?: Record<string, unknown>;
  };
  topK: number;
  backend: RetrievalBackend;
}

export interface ContextHit {
  chunkId: string;
  score: number;
  uri: string;
  textHash: string;
  content: string;
}

export interface GraphStats {
  entities: number;
  relations: number;
  hops: number;
}

export interface RetrievalResult {
  contexts: ContextHit[];
  graph: GraphStats;
  evidenceBundleRef: string;
}
