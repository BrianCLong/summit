/**
 * Types for vector search and ANN indexes
 */

export interface VectorDocument {
  id: string;
  vector: number[];
  metadata?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  distance: number;
  score: number;
  metadata?: Record<string, any>;
}

export interface VectorIndexConfig {
  dimension: number;
  metric?: 'cosine' | 'l2' | 'ip' | 'euclidean';
  indexType?: 'flat' | 'ivf' | 'hnsw' | 'ivf_hnsw' | 'lsh';
  efConstruction?: number; // HNSW parameter
  efSearch?: number; // HNSW parameter
  M?: number; // HNSW parameter
  nlist?: number; // IVF parameter
  nprobe?: number; // IVF parameter
  quantizer?: 'none' | 'pq' | 'sq';
}

export interface VectorIndex {
  readonly name: string;
  readonly dimension: number;
  readonly size: number;

  add(documents: VectorDocument[]): Promise<void>;
  addBatch(documents: VectorDocument[], batchSize?: number): Promise<void>;
  search(query: number[], k: number): Promise<SearchResult[]>;
  searchBatch(queries: number[][], k: number): Promise<SearchResult[][]>;
  remove(ids: string[]): Promise<void>;
  update(documents: VectorDocument[]): Promise<void>;
  save(path: string): Promise<void>;
  load(path: string): Promise<void>;
  clear(): void;
  getById(id: string): Promise<VectorDocument | null>;
}

export interface QuantizationConfig {
  method: 'pq' | 'sq' | 'none';
  nbits?: number; // For scalar quantization
  m?: number; // For product quantization
}

export interface IndexStatistics {
  totalVectors: number;
  dimension: number;
  indexType: string;
  memoryUsage: number;
  averageSearchTime: number;
  recall?: number;
}

export interface ANNBenchmark {
  indexType: string;
  buildTime: number;
  searchTime: number;
  recall: number;
  qps: number; // Queries per second
  memoryUsage: number;
}
