export type TenantId = string;

export type KnowledgeObjectKind =
  | "document"
  | "graph_entity"
  | "graph_edge"
  | "event"
  | "run_log"
  | "note";

export interface KnowledgeObject {
  id: string;
  tenantId: TenantId;
  kind: KnowledgeObjectKind;
  title?: string;
  body?: string;            // main textual content
  metadata: Record<string, unknown>;
  source: {
    pipelineKey?: string;
    sourceId?: string;
    originalUri?: string;
  };
  timestamps: {
    createdAt: string;
    updatedAt?: string;
    effectiveAt?: string;   // for events/time-based data
  };
}

export interface EmbeddingRecord {
  id: string;
  tenantId: TenantId;
  objectId: string;           // KnowledgeObject.id
  kind: KnowledgeObjectKind;
  provider: string;           // "openai", "local", etc.
  model: string;
  dim: number;
  vector: number[] | unknown; // actual storage may be DB vector type
  createdAt: string;
  version: string;            // embedding schema/version
}

export type RetrievalQueryKind = "semantic" | "keyword" | "hybrid";

export interface RetrievalQuery {
  tenantId: TenantId;
  queryKind: RetrievalQueryKind;
  queryText: string;
  filters?: {
    kinds?: KnowledgeObjectKind[];
    timeRange?: { from?: string; to?: string };
    metadata?: Record<string, unknown>; // e.g., projectId, tags
    graphEntityIds?: string[];          // restrict to specific graph context
  };
  topK?: number;
  includeContent?: boolean;
  correlationId?: string;
}

export interface RetrievalResultItem {
  object: KnowledgeObject;
  score: number;
  highlights?: {
    body?: string[];
    title?: string[];
  };
  relatedGraphEntities?: {
    id: string;
    type: string;
    label?: string;
  }[];
}

export interface RetrievalResult {
  tenantId: TenantId;
  query: RetrievalQuery;
  items: RetrievalResultItem[];
}
