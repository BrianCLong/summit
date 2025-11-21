/**
 * Visual Similarity and Search
 * Image embeddings, perceptual hashing, content-based retrieval
 */

import { BaseComputerVisionModel, ModelConfig, Embedding, cosineSimilarity, euclideanDistance, normalizeVector } from '@intelgraph/computer-vision';

export interface SimilaritySearchResult {
  query_id: string;
  matches: Array<{
    id: string;
    similarity: number;
    distance: number;
    metadata?: Record<string, any>;
  }>;
  search_time_ms: number;
}

export interface ImageEmbedding {
  id: string;
  embedding: number[];
  model: string;
  metadata?: Record<string, any>;
}

export interface PerceptualHash {
  hash: string;
  algorithm: 'phash' | 'dhash' | 'ahash' | 'whash';
  bits: number;
}

/**
 * Visual Similarity Engine
 * Provides image embedding, hashing, and similarity search
 */
export class VisualSimilarityEngine extends BaseComputerVisionModel {
  private embeddings: Map<string, ImageEmbedding> = new Map();
  private hashes: Map<string, PerceptualHash> = new Map();

  constructor(config?: Partial<ModelConfig>) {
    super({
      model_name: 'visual_similarity',
      device: config?.device || 'cuda',
      ...config,
    });
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async processImage(imagePath: string, options?: any): Promise<ImageEmbedding> {
    return this.generateEmbedding(imagePath, options?.id || imagePath);
  }

  /**
   * Generate image embedding using deep learning model
   */
  async generateEmbedding(imagePath: string, id: string, options?: {
    model?: 'resnet50' | 'efficientnet' | 'clip' | 'dino';
    normalize?: boolean;
  }): Promise<ImageEmbedding> {
    this.ensureInitialized();

    // Simulated embedding generation (production would use actual model)
    const embedding = new Array(512).fill(0).map(() => Math.random() * 2 - 1);
    const normalizedEmbedding = options?.normalize !== false ? normalizeVector(embedding) : embedding;

    const result: ImageEmbedding = {
      id,
      embedding: normalizedEmbedding,
      model: options?.model || 'resnet50',
    };

    this.embeddings.set(id, result);
    return result;
  }

  /**
   * Generate perceptual hash
   */
  async generatePerceptualHash(imagePath: string, id: string, options?: {
    algorithm?: 'phash' | 'dhash' | 'ahash' | 'whash';
    bits?: number;
  }): Promise<PerceptualHash> {
    this.ensureInitialized();

    const bits = options?.bits || 64;
    // Simulated hash generation
    const hashBits = new Array(bits).fill(0).map(() => Math.random() > 0.5 ? '1' : '0').join('');
    const hash = BigInt('0b' + hashBits).toString(16).padStart(bits / 4, '0');

    const result: PerceptualHash = {
      hash,
      algorithm: options?.algorithm || 'phash',
      bits,
    };

    this.hashes.set(id, result);
    return result;
  }

  /**
   * Search for similar images by embedding
   */
  async searchByEmbedding(queryEmbedding: number[], options?: {
    topK?: number;
    threshold?: number;
    metric?: 'cosine' | 'euclidean';
  }): Promise<SimilaritySearchResult> {
    this.ensureInitialized();
    const startTime = Date.now();

    const topK = options?.topK || 10;
    const threshold = options?.threshold || 0;
    const metric = options?.metric || 'cosine';

    const results: Array<{ id: string; similarity: number; distance: number; metadata?: any }> = [];

    for (const [id, embedding] of this.embeddings) {
      let similarity: number;
      let distance: number;

      if (metric === 'cosine') {
        similarity = cosineSimilarity(queryEmbedding, embedding.embedding);
        distance = 1 - similarity;
      } else {
        distance = euclideanDistance(queryEmbedding, embedding.embedding);
        similarity = 1 / (1 + distance);
      }

      if (similarity >= threshold) {
        results.push({ id, similarity, distance, metadata: embedding.metadata });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);

    return {
      query_id: 'query',
      matches: results.slice(0, topK),
      search_time_ms: Date.now() - startTime,
    };
  }

  /**
   * Search for similar images by perceptual hash
   */
  async searchByHash(queryHash: string, options?: {
    topK?: number;
    maxHammingDistance?: number;
  }): Promise<SimilaritySearchResult> {
    this.ensureInitialized();
    const startTime = Date.now();

    const topK = options?.topK || 10;
    const maxDistance = options?.maxHammingDistance || 10;

    const results: Array<{ id: string; similarity: number; distance: number }> = [];

    for (const [id, hash] of this.hashes) {
      const distance = this.hammingDistance(queryHash, hash.hash);
      const similarity = 1 - distance / (hash.bits || 64);

      if (distance <= maxDistance) {
        results.push({ id, similarity, distance });
      }
    }

    results.sort((a, b) => a.distance - b.distance);

    return {
      query_id: 'query',
      matches: results.slice(0, topK),
      search_time_ms: Date.now() - startTime,
    };
  }

  /**
   * Find near-duplicate images
   */
  async findNearDuplicates(imagePath: string, options?: {
    threshold?: number;
    method?: 'embedding' | 'hash';
  }): Promise<SimilaritySearchResult> {
    const method = options?.method || 'embedding';
    const threshold = options?.threshold || 0.95;

    if (method === 'embedding') {
      const embedding = await this.generateEmbedding(imagePath, 'query');
      return this.searchByEmbedding(embedding.embedding, { threshold });
    } else {
      const hash = await this.generatePerceptualHash(imagePath, 'query');
      return this.searchByHash(hash.hash, { maxHammingDistance: 5 });
    }
  }

  /**
   * Calculate Hamming distance between two hashes
   */
  private hammingDistance(hash1: string, hash2: string): number {
    let distance = 0;
    const len = Math.min(hash1.length, hash2.length);

    for (let i = 0; i < len; i++) {
      const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
      distance += this.popCount(xor);
    }

    return distance;
  }

  /**
   * Count set bits (population count)
   */
  private popCount(n: number): number {
    let count = 0;
    while (n) {
      count += n & 1;
      n >>= 1;
    }
    return count;
  }

  /**
   * Add image to index
   */
  async indexImage(imagePath: string, id: string, metadata?: Record<string, any>): Promise<void> {
    const embedding = await this.generateEmbedding(imagePath, id);
    embedding.metadata = metadata;
    this.embeddings.set(id, embedding);

    await this.generatePerceptualHash(imagePath, id);
  }

  /**
   * Get index statistics
   */
  getIndexStats(): { embeddingCount: number; hashCount: number } {
    return {
      embeddingCount: this.embeddings.size,
      hashCount: this.hashes.size,
    };
  }

  /**
   * Clear index
   */
  clearIndex(): void {
    this.embeddings.clear();
    this.hashes.clear();
  }
}

export { cosineSimilarity, euclideanDistance, normalizeVector };
