export interface FederatedHit {
  docId: string;
  sourceId: string;
  modality: "vector" | "keyword" | "graph";
  score: number;
  metadata?: Record<string, any>;
}

export interface RetrievalAdapter {
  sourceId: string;
  modality: "vector" | "keyword" | "graph";
  search(query: string, k: number, tenantId: string): Promise<FederatedHit[]>;
}
