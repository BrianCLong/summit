/**
 * HNSW (Hierarchical Navigable Small World) index
 * Fast approximate nearest neighbor search
 */

import type {
  VectorIndex,
  VectorDocument,
  SearchResult,
  VectorIndexConfig,
} from '../types.js';
import { Mutex } from 'async-mutex';
import * as fs from 'fs-extra';

export class HNSWIndex implements VectorIndex {
  readonly name: string;
  readonly dimension: number;

  private index: any;
  private documents: Map<string, VectorDocument>;
  private mutex: Mutex;
  private config: VectorIndexConfig;
  private idToIndex: Map<string, number>;
  private indexToId: Map<number, string>;
  private nextIndex: number = 0;

  constructor(name: string, config: VectorIndexConfig) {
    this.name = name;
    this.dimension = config.dimension;
    this.config = config;
    this.documents = new Map();
    this.idToIndex = new Map();
    this.indexToId = new Map();
    this.mutex = new Mutex();
  }

  async initialize(): Promise<void> {
    try {
      const hnswlib = await import('hnswlib-node');
      const { HierarchicalNSW } = hnswlib;

      const metric = this.config.metric === 'cosine' ? 'cosine' : 'l2';
      const maxElements = 10000; // Will grow automatically

      this.index = new HierarchicalNSW(metric, this.dimension);
      this.index.initIndex(
        maxElements,
        this.config.M || 16,
        this.config.efConstruction || 200,
      );
      this.index.setEf(this.config.efSearch || 50);

      console.log(`HNSW index initialized: ${this.name}`);
    } catch (error) {
      console.error('Failed to initialize HNSW index:', error);
      throw error;
    }
  }

  get size(): number {
    return this.documents.size;
  }

  async add(documents: VectorDocument[]): Promise<void> {
    const release = await this.mutex.acquire();

    try {
      if (!this.index) {
        await this.initialize();
      }

      for (const doc of documents) {
        const idx = this.nextIndex++;
        this.idToIndex.set(doc.id, idx);
        this.indexToId.set(idx, doc.id);
        this.documents.set(doc.id, doc);

        await this.index.addPoint(doc.vector, idx);
      }

      console.log(`Added ${documents.length} vectors to HNSW index`);
    } finally {
      release();
    }
  }

  async addBatch(
    documents: VectorDocument[],
    batchSize: number = 1000,
  ): Promise<void> {
    await this.add(documents);
  }

  async search(query: number[], k: number): Promise<SearchResult[]> {
    if (!this.index) {
      await this.initialize();
    }

    const result = await this.index.searchKnn(query, k);

    const results: SearchResult[] = [];
    for (let i = 0; i < result.neighbors.length; i++) {
      const idx = result.neighbors[i];
      const id = this.indexToId.get(idx);

      if (id) {
        const doc = this.documents.get(id);
        results.push({
          id,
          distance: result.distances[i],
          score: 1 / (1 + result.distances[i]),
          metadata: doc?.metadata,
        });
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
      results.push(await this.search(query, k));
    }
    return results;
  }

  async remove(ids: string[]): Promise<void> {
    const release = await this.mutex.acquire();

    try {
      for (const id of ids) {
        const idx = this.idToIndex.get(id);
        if (idx !== undefined) {
          await this.index.markDelete(idx);
          this.idToIndex.delete(id);
          this.indexToId.delete(idx);
          this.documents.delete(id);
        }
      }
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
      await this.index.writeIndex(path);

      const metadata = {
        documents: Array.from(this.documents.values()),
        idToIndex: Array.from(this.idToIndex.entries()),
        indexToId: Array.from(this.indexToId.entries()),
        nextIndex: this.nextIndex,
      };

      await fs.writeJSON(`${path}.metadata.json`, metadata, { spaces: 2 });
      console.log(`HNSW index saved to ${path}`);
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

      await this.index.readIndex(path);

      const metadata = await fs.readJSON(`${path}.metadata.json`);
      this.documents = new Map(
        metadata.documents.map((d: VectorDocument) => [d.id, d]),
      );
      this.idToIndex = new Map(metadata.idToIndex);
      this.indexToId = new Map(metadata.indexToId);
      this.nextIndex = metadata.nextIndex;

      console.log(`HNSW index loaded from ${path}`);
    } finally {
      release();
    }
  }

  clear(): void {
    this.documents.clear();
    this.idToIndex.clear();
    this.indexToId.clear();
    this.nextIndex = 0;
    this.index = null;
  }

  async getById(id: string): Promise<VectorDocument | null> {
    return this.documents.get(id) || null;
  }
}
