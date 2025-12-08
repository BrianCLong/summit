export type TenantId = string;
export type DocumentId = string;
export type CollectionId = string;
export type IndexId = string;
export type ChunkId = string;

export type DataSensitivity = "public" | "internal" | "confidential" | "restricted";

export interface Document {
  id: DocumentId;
  tenantId: TenantId;
  collectionId: CollectionId;
  title?: string;
  sourceUri?: string;
  mimeType?: string;
  sizeBytes?: number;
  hash?: string;
  sensitivity?: DataSensitivity;
  processingStatus: "pending" | "processing" | "completed" | "failed";
  processingError?: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface Chunk {
  id: ChunkId;
  documentId: DocumentId;
  tenantId: TenantId;
  collectionId: CollectionId;
  indexId: IndexId;
  position: number;
  text: string;
  embedding?: number[];
  sensitivity?: DataSensitivity;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface Index {
  id: IndexId;
  tenantId: TenantId;
  collectionId: CollectionId;
  name: string;
  kind: "vector" | "keyword" | "hybrid";
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface Collection {
  id: CollectionId;
  tenantId: TenantId;
  name: string;
  description?: string;
  defaultIndexId?: IndexId;
  sensitivity?: DataSensitivity;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface RetrievalQuery {
  tenantId: TenantId;
  collectionIds?: CollectionId[];
  indexIds?: IndexId[];
  query: string;
  topK: number;
  filter?: Record<string, unknown>;
  sensitivityMax?: DataSensitivity;
}

export interface RetrievalResultChunk {
  chunkId: ChunkId;
  documentId: DocumentId;
  collectionId: CollectionId;
  text: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface RetrievalResponse {
  query: RetrievalQuery;
  chunks: RetrievalResultChunk[];
  diagnostics?: {
    indexId?: IndexId;
    rawScores?: number[];
    appliedFilters?: Record<string, unknown>;
    traceId?: string;
  };
}

export interface RagQuestion {
  tenantId: TenantId;
  principalId: string;
  question: string;
  retrieval: RetrievalQuery;
  generationConfig?: {
    model?: string;
    style?: "concise" | "detailed" | "bullet" | "json";
    maxTokens?: number;
    temperature?: number;
  };
}

export interface RagCitation {
  chunkId: ChunkId;
  documentId: DocumentId;
  collectionId: CollectionId;
  score: number;
  snippet: string;
  sourceUri?: string;
  title?: string;
}

export interface RagAnswer {
  answer: string;
  citations: RagCitation[];
  retrieval: RetrievalResponse;
  metrics: {
    tokensInput: number;
    tokensOutput: number;
    costEstimate: number;
    latencyMs: number;
  };
  safety: {
    policyOk: boolean;
    flags: string[];
  };
}
