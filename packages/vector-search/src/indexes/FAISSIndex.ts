/**
 * FAISS (Facebook AI Similarity Search) index wrapper
 * High-performance similarity search library
 */

import type {
  VectorIndex,
  VectorDocument,
  SearchResult,
  VectorIndexConfig,
} from '../types.js';
import { Mutex } from 'async-mutex';
import * as fs from 'fs-extra';

/**
 * FAISS Index implementation
 * Note: This is a TypeScript wrapper. The actual FAISS library needs to be
 * installed separately: npm install faiss-node
 */
export class FAISSIndex implements VectorIndex {
  readonly name: string;
  readonly dimension: number;

  private index: any; // FAISS index instance
  private documents: Map<string, VectorDocument>;
  private mutex: Mutex;
  private config: VectorIndexConfig;

  constructor(name: string, config: VectorIndexConfig) {
    this.name = name;
    this.dimension = config.dimension;
    this.config = config;
    this.documents = new Map();
    this.mutex = new Mutex();
  }

  /**
   * Initialize the FAISS index
   */
  async initialize(): Promise<void> {
    try {
      // Dynamic import for faiss-node
      const faissModule = await import('faiss-node');
      const { IndexFlatL2, IndexIVFFlat, IndexHNSWFlat } = faissModule;

      const metric = this.config.metric || 'l2';
      const indexType = this.config.indexType || 'flat';

      switch (indexType) {
        case 'flat':
          if (metric === 'l2' || metric === 'euclidean') {
            this.index = new IndexFlatL2(this.dimension);
          } else if (metric === 'ip' || metric === 'cosine') {
            const { IndexFlatIP } = faissModule;
            this.index = new IndexFlatIP(this.dimension);
          }
          break;

        case 'ivf':
          const nlist = this.config.nlist || 100;
          const quantizer = new IndexFlatL2(this.dimension);
          this.index = new IndexIVFFlat(quantizer, this.dimension, nlist);
          break;

        case 'hnsw':
          const M = this.config.M || 32;
          this.index = new IndexHNSWFlat(this.dimension, M);
          if (this.config.efConstruction) {
            this.index.setEfConstruction(this.config.efConstruction);
          }
          if (this.config.efSearch) {
            this.index.setEfSearch(this.config.efSearch);
          }
          break;

        default:
          throw new Error(`Unsupported index type: ${indexType}`);
      }

      console.log(`FAISS index initialized: ${this.name}`);
    } catch (error) {
      console.error('Failed to initialize FAISS index:', error);
      // Fall back to in-memory implementation
      this.index = new InMemoryFallbackIndex(this.dimension);
    }
  }

  get size(): number {
    return this.documents.size;
  }

  async add(documents: VectorDocument[]): Promise<void> {
    await this.addBatch(documents);
  }

  async addBatch(
    documents: VectorDocument[],
    batchSize: number = 1000,
  ): Promise<void> {
    const release = await this.mutex.acquire();

    try {
      if (!this.index) {
        await this.initialize();
      }

      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);

        // Convert to FAISS format (Float32Array)
        const vectors = new Float32Array(batch.length * this.dimension);
        for (let j = 0; j < batch.length; j++) {
          for (let k = 0; k < this.dimension; k++) {
            vectors[j * this.dimension + k] = batch[j].vector[k];
          }
        }

        // Add to FAISS index
        await this.index.add(vectors);

        // Store documents with metadata
        for (const doc of batch) {
          this.documents.set(doc.id, doc);
        }
      }

      console.log(`Added ${documents.length} vectors to FAISS index`);
    } finally {
      release();
    }
  }

  async search(query: number[], k: number): Promise<SearchResult[]> {
    if (!this.index) {
      await this.initialize();
    }

    // Normalize query for cosine similarity
    const normalizedQuery =
      this.config.metric === 'cosine' ? this.normalize(query) : query;

    // Convert to Float32Array
    const queryVector = new Float32Array(normalizedQuery);

    // Search
    const { distances, labels } = await this.index.search(queryVector, k);

    // Convert results
    const results: SearchResult[] = [];
    const documentIds = Array.from(this.documents.keys());

    for (let i = 0; i < labels.length; i++) {
      const idx = labels[i];
      if (idx >= 0 && idx < documentIds.length) {
        const id = documentIds[idx];
        const doc = this.documents.get(id);

        if (doc) {
          results.push({
            id,
            distance: distances[i],
            score: this.distanceToScore(distances[i]),
            metadata: doc.metadata,
          });
        }
      }
    }

    return results;
  }

  async searchBatch(
    queries: number[][],
    k: number,
  ): Promise<SearchResult[][]> {
    const results: SearchResult[][] = [];

    for (const query of queries) {
      const queryResults = await this.search(query, k);
      results.push(queryResults);
    }

    return results;
  }

  async remove(ids: string[]): Promise<void> {
    const release = await this.mutex.acquire();

    try {
      for (const id of ids) {
        this.documents.delete(id);
      }

      // FAISS doesn't support direct deletion, need to rebuild
      await this.rebuild();
    } finally {
      release();
    }
  }

  async update(documents: VectorDocument[]): Promise<void> {
    await this.remove(documents.map((d) => d.id));
    await this.add(documents);
  }

  async save(path: string): Promise<void> {
    const release = await this.mutex.acquire();

    try {
      // Save FAISS index
      await this.index.write(path);

      // Save document metadata
      const metadataPath = `${path}.metadata.json`;
      const documentsArray = Array.from(this.documents.values());
      await fs.writeJSON(metadataPath, documentsArray, { spaces: 2 });

      console.log(`FAISS index saved to ${path}`);
    } finally {
      release();
    }
  }

  async load(path: string): Promise<void> {
    const release = await this.mutex.acquire();

    try {
      if (!this.index) {
        await this.initialize();
      }

      // Load FAISS index
      await this.index.read(path);

      // Load document metadata
      const metadataPath = `${path}.metadata.json`;
      if (await fs.pathExists(metadataPath)) {
        const documentsArray = await fs.readJSON(metadataPath);
        this.documents = new Map(documentsArray.map((d: VectorDocument) => [d.id, d]));
      }

      console.log(`FAISS index loaded from ${path}`);
    } finally {
      release();
    }
  }

  clear(): void {
    this.documents.clear();
    this.index = null;
  }

  async getById(id: string): Promise<VectorDocument | null> {
    return this.documents.get(id) || null;
  }

  /**
   * Rebuild the index (needed after deletions)
   */
  private async rebuild(): Promise<void> {
    const docs = Array.from(this.documents.values());
    this.index = null;
    await this.initialize();
    await this.addBatch(docs);
  }

  /**
   * Normalize vector to unit length
   */
  private normalize(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return norm === 0 ? vector : vector.map((val) => val / norm);
  }

  /**
   * Convert distance to similarity score (0-1)
   */
  private distanceToScore(distance: number): number {
    if (this.config.metric === 'cosine' || this.config.metric === 'ip') {
      return 1 / (1 + distance);
    }
    // For L2/Euclidean distance
    return 1 / (1 + Math.sqrt(distance));
  }
}

/**
 * Fallback in-memory index when FAISS is not available
 */
class InMemoryFallbackIndex {
  private dimension: number;
  private vectors: Float32Array[] = [];

  constructor(dimension: number) {
    this.dimension = dimension;
  }

  async add(vectors: Float32Array): Promise<void> {
    const numVectors = vectors.length / this.dimension;
    for (let i = 0; i < numVectors; i++) {
      const vector = vectors.slice(
        i * this.dimension,
        (i + 1) * this.dimension,
      );
      this.vectors.push(vector);
    }
  }

  async search(
    query: Float32Array,
    k: number,
  ): Promise<{ distances: number[]; labels: number[] }> {
    const distances: Array<{ distance: number; index: number }> = [];

    for (let i = 0; i < this.vectors.length; i++) {
      const distance = this.computeL2Distance(query, this.vectors[i]);
      distances.push({ distance, index: i });
    }

    distances.sort((a, b) => a.distance - b.distance);

    const topK = distances.slice(0, k);
    return {
      distances: topK.map((d) => d.distance),
      labels: topK.map((d) => d.index),
    };
  }

  async write(path: string): Promise<void> {
    // Simple serialization
    const data = this.vectors.map((v) => Array.from(v));
    await fs.writeJSON(path, data);
  }

  async read(path: string): Promise<void> {
    const data = await fs.readJSON(path);
    this.vectors = data.map((v: number[]) => new Float32Array(v));
  }

  private computeL2Distance(a: Float32Array, b: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return sum;
  }
}
