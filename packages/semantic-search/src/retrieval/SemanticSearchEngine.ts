/**
 * Main semantic search engine
 * Orchestrates embedding, indexing, retrieval, and re-ranking
 */

import type {
  EmbeddingModel,
  Embedding,
  SemanticSearchResult,
  SearchOptions,
  CrossEncoderModel,
  SimilarityMetric,
} from '../types.js';
import { bruteForceANN, normalizeVector } from '../utils/vectorSimilarity.js';
import { LRUCache } from 'lru-cache';

export interface SemanticSearchEngineConfig {
  embeddingModel: EmbeddingModel;
  crossEncoder?: CrossEncoderModel;
  similarityMetric?: SimilarityMetric;
  cacheSize?: number;
  defaultTopK?: number;
}

export class SemanticSearchEngine {
  private embeddingModel: EmbeddingModel;
  private crossEncoder?: CrossEncoderModel;
  private similarityMetric: SimilarityMetric;
  private embeddings: Map<string, Embedding>;
  private queryCache: LRUCache<string, number[]>;
  private defaultTopK: number;

  constructor(config: SemanticSearchEngineConfig) {
    this.embeddingModel = config.embeddingModel;
    this.crossEncoder = config.crossEncoder;
    this.similarityMetric = config.similarityMetric || 'cosine';
    this.embeddings = new Map();
    this.defaultTopK = config.defaultTopK || 10;

    this.queryCache = new LRUCache<string, number[]>({
      max: config.cacheSize || 1000,
      ttl: 1000 * 60 * 60, // 1 hour
    });
  }

  /**
   * Initialize the search engine
   */
  async initialize(): Promise<void> {
    await this.embeddingModel.warmup();
    console.log('Semantic search engine initialized');
  }

  /**
   * Add documents to the search index
   */
  async addDocuments(
    documents: Array<{ id: string; text: string; metadata?: Record<string, any> }>,
  ): Promise<void> {
    const texts = documents.map((doc) => doc.text);
    const vectors = await this.embeddingModel.embed(texts);

    for (let i = 0; i < documents.length; i++) {
      const embedding: Embedding = {
        id: documents[i].id,
        vector: vectors[i],
        text: documents[i].text,
        metadata: documents[i].metadata,
      };
      this.embeddings.set(documents[i].id, embedding);
    }

    console.log(`Added ${documents.length} documents to index`);
  }

  /**
   * Search for similar documents
   */
  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SemanticSearchResult[]> {
    // Get or compute query embedding
    let queryEmbedding = this.queryCache.get(query);
    if (!queryEmbedding) {
      queryEmbedding = await this.embeddingModel.embedQuery(query);
      this.queryCache.set(query, queryEmbedding);
    }

    // Get all embeddings as array
    const embeddingArray = Array.from(this.embeddings.values());

    // Apply metadata filters if provided
    let filteredEmbeddings = embeddingArray;
    if (options.filter) {
      filteredEmbeddings = this.applyFilters(embeddingArray, options.filter);
    }

    // Compute similarity scores
    const topK = options.topK || this.defaultTopK;
    const results = bruteForceANN(
      queryEmbedding,
      filteredEmbeddings.map((e) => ({
        id: e.id,
        vector: e.vector,
        metadata: e.metadata,
      })),
      topK * 2, // Get more for re-ranking
      this.similarityMetric,
    );

    // Apply minimum score filter
    let filteredResults = results;
    if (options.minScore) {
      filteredResults = results.filter((r) => r.score >= options.minScore!);
    }

    // Re-rank if cross-encoder is available and requested
    if (options.rerank && this.crossEncoder) {
      const candidates = filteredResults
        .map((r) => {
          const embedding = this.embeddings.get(r.id);
          return embedding && embedding.text
            ? { id: r.id, text: embedding.text }
            : null;
        })
        .filter((c) => c !== null) as Array<{ id: string; text: string }>;

      if (candidates.length > 0) {
        const rerankedScores = await this.crossEncoder.rerank(
          query,
          candidates,
          topK,
        );

        // Create a map of reranked scores
        const scoreMap = new Map(
          rerankedScores.map((r) => [r.id, r.score]),
        );

        // Update results with reranked scores
        filteredResults = filteredResults
          .map((r) => ({
            ...r,
            score: scoreMap.get(r.id) || r.score,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, topK);
      }
    } else {
      filteredResults = filteredResults.slice(0, topK);
    }

    // Construct final results
    return filteredResults.map((r) => {
      const embedding = this.embeddings.get(r.id);
      return {
        id: r.id,
        score: r.score,
        text: embedding?.text,
        metadata: embedding?.metadata,
        embedding: options.includeEmbeddings ? embedding?.vector : undefined,
      };
    });
  }

  /**
   * Find similar documents to a given document
   */
  async findSimilar(
    documentId: string,
    options: SearchOptions = {},
  ): Promise<SemanticSearchResult[]> {
    const embedding = this.embeddings.get(documentId);
    if (!embedding) {
      throw new Error(`Document ${documentId} not found`);
    }

    // Get all embeddings except the query document
    const embeddingArray = Array.from(this.embeddings.values()).filter(
      (e) => e.id !== documentId,
    );

    // Apply filters
    let filteredEmbeddings = embeddingArray;
    if (options.filter) {
      filteredEmbeddings = this.applyFilters(embeddingArray, options.filter);
    }

    const topK = options.topK || this.defaultTopK;
    const results = bruteForceANN(
      embedding.vector,
      filteredEmbeddings.map((e) => ({
        id: e.id,
        vector: e.vector,
        metadata: e.metadata,
      })),
      topK,
      this.similarityMetric,
    );

    return results.map((r) => {
      const emb = this.embeddings.get(r.id);
      return {
        id: r.id,
        score: r.score,
        text: emb?.text,
        metadata: emb?.metadata,
        embedding: options.includeEmbeddings ? emb?.vector : undefined,
      };
    });
  }

  /**
   * Remove documents from the index
   */
  removeDocuments(documentIds: string[]): void {
    for (const id of documentIds) {
      this.embeddings.delete(id);
    }
    console.log(`Removed ${documentIds.length} documents from index`);
  }

  /**
   * Update documents in the index
   */
  async updateDocuments(
    documents: Array<{ id: string; text: string; metadata?: Record<string, any> }>,
  ): Promise<void> {
    // Remove old versions
    this.removeDocuments(documents.map((d) => d.id));

    // Add new versions
    await this.addDocuments(documents);
  }

  /**
   * Get index statistics
   */
  getStats(): {
    documentCount: number;
    dimension: number;
    cacheSize: number;
  } {
    return {
      documentCount: this.embeddings.size,
      dimension: this.embeddingModel.dimension,
      cacheSize: this.queryCache.size,
    };
  }

  /**
   * Clear the entire index
   */
  clear(): void {
    this.embeddings.clear();
    this.queryCache.clear();
    console.log('Index cleared');
  }

  /**
   * Apply metadata filters to embeddings
   */
  private applyFilters(
    embeddings: Embedding[],
    filter: Record<string, any>,
  ): Embedding[] {
    return embeddings.filter((embedding) => {
      if (!embedding.metadata) return false;

      for (const [key, value] of Object.entries(filter)) {
        if (Array.isArray(value)) {
          if (!value.includes(embedding.metadata[key])) {
            return false;
          }
        } else {
          if (embedding.metadata[key] !== value) {
            return false;
          }
        }
      }
      return true;
    });
  }

  /**
   * Export embeddings to JSON
   */
  async export(): Promise<string> {
    const data = Array.from(this.embeddings.values());
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import embeddings from JSON
   */
  async import(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData) as Embedding[];
    this.embeddings.clear();

    for (const embedding of data) {
      this.embeddings.set(embedding.id, embedding);
    }

    console.log(`Imported ${data.length} embeddings`);
  }
}
