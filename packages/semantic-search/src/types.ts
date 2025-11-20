/**
 * Core types for semantic search and vector embeddings
 */

export interface Embedding {
  id: string;
  vector: number[];
  metadata?: Record<string, any>;
  text?: string;
}

export interface EmbeddingModel {
  readonly name: string;
  readonly dimension: number;
  embed(texts: string[]): Promise<number[][]>;
  embedQuery(query: string): Promise<number[]>;
  isReady(): boolean;
  warmup(): Promise<void>;
}

export interface SemanticSearchResult {
  id: string;
  score: number;
  text?: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

export interface SearchOptions {
  topK?: number;
  minScore?: number;
  includeEmbeddings?: boolean;
  filter?: Record<string, any>;
  rerank?: boolean;
  rerankModel?: string;
}

export interface VectorIndex {
  readonly name: string;
  readonly dimension: number;
  add(embeddings: Embedding[]): Promise<void>;
  search(query: number[], options: SearchOptions): Promise<SemanticSearchResult[]>;
  remove(ids: string[]): Promise<void>;
  update(embeddings: Embedding[]): Promise<void>;
  size(): Promise<number>;
  save(path: string): Promise<void>;
  load(path: string): Promise<void>;
}

export type SimilarityMetric = 'cosine' | 'euclidean' | 'dot_product' | 'manhattan';

export interface VectorSimilarity {
  metric: SimilarityMetric;
  compute(a: number[], b: number[]): number;
  computeBatch(query: number[], vectors: number[][]): number[];
}

export interface EmbeddingProviderConfig {
  provider: 'local' | 'openai' | 'cohere' | 'voyage' | 'custom';
  model?: string;
  apiKey?: string;
  endpoint?: string;
  batchSize?: number;
  maxRetries?: number;
  timeout?: number;
  cacheEnabled?: boolean;
  cacheSize?: number;
}

export interface CrossEncoderModel {
  readonly name: string;
  rerank(
    query: string,
    candidates: Array<{ id: string; text: string }>,
    topK?: number,
  ): Promise<Array<{ id: string; score: number }>>;
}

export interface HybridSearchConfig {
  lexicalWeight?: number; // 0-1, weight for lexical search
  semanticWeight?: number; // 0-1, weight for semantic search
  fusionMethod?: 'rrf' | 'linear' | 'normalized_linear' | 'multiplicative';
  rrfK?: number; // RRF constant, typically 60
}

export interface QueryExpansion {
  synonyms?: boolean;
  hyponyms?: boolean;
  hypernyms?: boolean;
  related?: boolean;
  maxExpansions?: number;
}

export interface MultiModalEmbedding {
  text?: number[];
  image?: number[];
  audio?: number[];
  video?: number[];
  combined?: number[];
}
