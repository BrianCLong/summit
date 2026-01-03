import type { Driver } from 'neo4j-driver';
import type { Pool } from 'pg';

export type Metadata = Record<string, string | number | boolean | null>;

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  position: number;
  startOffset: number;
  endOffset: number;
  metadata?: Metadata;
  embedding?: number[];
}

export interface RetrievedChunk extends DocumentChunk {
  score: number;
  sourceId?: string;
  title?: string;
}

export interface Citation {
  sourceId: string;
  snippet: string;
  offsets: { start: number; end: number };
  score: number;
  title?: string;
  url?: string;
}

export interface DocumentLoader {
  load(): Promise<{ id: string; content: string; metadata?: Metadata }[]>;
}

export interface Chunker {
  chunk(documentId: string, content: string, metadata?: Metadata): DocumentChunk[];
}

export interface Embedder {
  embed(text: string): Promise<number[]>;
}

export interface VectorStore {
  upsert(chunks: DocumentChunk[], workspaceId: string, corpusVersion: string): Promise<void>;
  similaritySearch(queryEmbedding: number[], topK: number, workspaceId?: string): Promise<RetrievedChunk[]>;
}

export interface GraphStore {
  upsertEntities(chunks: DocumentChunk[], workspaceId: string): Promise<void>;
  expandRelated(metadata: Metadata, limit: number): Promise<RetrievedChunk[]>;
}

export interface HybridRetriever {
  retrieve(queryEmbedding: number[], filters: Metadata | undefined, options: { topK: number }): Promise<RetrievedChunk[]>;
}

export interface RAGOrchestratorOptions {
  useHyde: boolean;
  useTools: boolean;
  topK: number;
  workspaceId?: string;
  filters?: Metadata;
}

export interface RAGResponse {
  answer: string;
  citations: Citation[];
  debug?: Record<string, unknown>;
}

export interface PlannerStep {
  plan: string[];
  rewrittenQuery: string;
}

export interface ToolCallResult {
  name: string;
  input: unknown;
  output: unknown;
}

export interface Neo4jProvider {
  driver: Driver;
}

export interface PostgresProvider {
  pool: Pool;
}

export interface RedisProvider {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<unknown>;
}

export interface StageTimings {
  [stage: string]: number;
}

