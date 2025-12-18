/**
 * Document Retriever
 * Semantic document search with embedding-based retrieval
 */

import { v4 as uuidv4 } from 'uuid';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { createClient, RedisClientType } from 'redis';
import OpenAI from 'openai';
import {
  RetrievalQuery,
  EvidenceChunk,
  CitationSource,
} from '../types/index.js';

const tracer = trace.getTracer('graphrag-document-retriever');

export interface DocumentRetrieverConfig {
  embeddingModel: string;
  maxDocuments: number;
  minRelevance: number;
  chunkSize: number;
  chunkOverlap: number;
  cacheEnabled: boolean;
  cacheTtlSeconds: number;
}

interface DocumentChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  content: string;
  embedding: number[];
  spanStart: number;
  spanEnd: number;
  metadata: Record<string, any>;
}

interface SearchResult {
  chunk: DocumentChunk;
  similarity: number;
}

export class DocumentRetriever {
  private config: DocumentRetrieverConfig;
  private redis: RedisClientType | null = null;
  private openai: OpenAI;
  private documentStore: Map<string, DocumentChunk[]> = new Map();

  constructor(
    openaiApiKey: string,
    redisUrl?: string,
    config: Partial<DocumentRetrieverConfig> = {},
  ) {
    this.config = {
      embeddingModel: config.embeddingModel ?? 'text-embedding-3-small',
      maxDocuments: config.maxDocuments ?? 20,
      minRelevance: config.minRelevance ?? 0.3,
      chunkSize: config.chunkSize ?? 1000,
      chunkOverlap: config.chunkOverlap ?? 100,
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTtlSeconds: config.cacheTtlSeconds ?? 3600,
    };

    this.openai = new OpenAI({ apiKey: openaiApiKey });

    if (redisUrl && this.config.cacheEnabled) {
      this.initializeRedis(redisUrl);
    }
  }

  private async initializeRedis(url: string): Promise<void> {
    try {
      this.redis = createClient({ url });
      await this.redis.connect();
    } catch (error) {
      console.warn('Redis connection failed, caching disabled:', error);
      this.redis = null;
    }
  }

  /**
   * Retrieve relevant document chunks based on query
   */
  async retrieve(query: RetrievalQuery): Promise<EvidenceChunk[]> {
    return tracer.startActiveSpan('document_retrieval', async (span) => {
      const startTime = Date.now();

      try {
        span.setAttribute('query.length', query.query.length);
        span.setAttribute('config.maxDocuments', this.config.maxDocuments);

        // Generate query embedding
        const queryEmbedding = await this.generateEmbedding(query.query);
        span.setAttribute('embedding.dimensions', queryEmbedding.length);

        // Search for similar chunks
        const searchResults = await this.searchSimilarChunks(
          queryEmbedding,
          query.tenantId,
          query.maxDocuments,
          query.minRelevance,
        );
        span.setAttribute('results.count', searchResults.length);

        // Convert to evidence chunks
        const evidenceChunks = searchResults.map((result) =>
          this.toEvidenceChunk(result, query.tenantId),
        );

        span.setStatus({ code: SpanStatusCode.OK });
        span.setAttribute('processing.timeMs', Date.now() - startTime);

        return evidenceChunks;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Index a document into the retriever
   */
  async indexDocument(
    documentId: string,
    title: string,
    content: string,
    tenantId: string,
    metadata: Record<string, any> = {},
  ): Promise<number> {
    return tracer.startActiveSpan('document_indexing', async (span) => {
      try {
        span.setAttribute('document.id', documentId);
        span.setAttribute('document.length', content.length);

        // Chunk the document
        const textChunks = this.chunkText(content);
        span.setAttribute('chunks.count', textChunks.length);

        // Generate embeddings for all chunks
        const chunks: DocumentChunk[] = [];

        for (let i = 0; i < textChunks.length; i++) {
          const chunk = textChunks[i];
          const embedding = await this.generateEmbedding(chunk.text);

          chunks.push({
            id: `${documentId}_chunk_${i}`,
            documentId,
            documentTitle: title,
            content: chunk.text,
            embedding,
            spanStart: chunk.start,
            spanEnd: chunk.end,
            metadata: {
              ...metadata,
              tenantId,
              chunkIndex: i,
              totalChunks: textChunks.length,
            },
          });
        }

        // Store chunks
        const key = `${tenantId}:${documentId}`;
        this.documentStore.set(key, chunks);

        // Cache in Redis if available
        if (this.redis) {
          await this.redis.setEx(
            `doc:${key}`,
            this.config.cacheTtlSeconds,
            JSON.stringify(chunks),
          );
        }

        span.setStatus({ code: SpanStatusCode.OK });
        return chunks.length;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    if (this.redis && this.config.cacheEnabled) {
      const cacheKey = `emb:${this.hashText(text)}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const response = await this.openai.embeddings.create({
      model: this.config.embeddingModel,
      input: text.slice(0, 8000), // Limit input length
    });

    const embedding = response.data[0].embedding;

    // Cache the embedding
    if (this.redis && this.config.cacheEnabled) {
      const cacheKey = `emb:${this.hashText(text)}`;
      await this.redis.setEx(
        cacheKey,
        this.config.cacheTtlSeconds,
        JSON.stringify(embedding),
      );
    }

    return embedding;
  }

  /**
   * Search for similar chunks using cosine similarity
   */
  private async searchSimilarChunks(
    queryEmbedding: number[],
    tenantId: string,
    maxResults: number,
    minRelevance: number,
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    // Search through all documents for this tenant
    for (const [key, chunks] of this.documentStore.entries()) {
      if (!key.startsWith(`${tenantId}:`)) continue;

      for (const chunk of chunks) {
        const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);

        if (similarity >= minRelevance) {
          results.push({ chunk, similarity });
        }
      }
    }

    // Sort by similarity and limit
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
  }

  /**
   * Compute cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Chunk text into overlapping segments
   */
  private chunkText(text: string): Array<{ text: string; start: number; end: number }> {
    const chunks: Array<{ text: string; start: number; end: number }> = [];
    const { chunkSize, chunkOverlap } = this.config;

    if (text.length <= chunkSize) {
      return [{ text, start: 0, end: text.length }];
    }

    let start = 0;
    while (start < text.length) {
      let end = start + chunkSize;

      // Try to break at sentence boundary
      if (end < text.length) {
        const sentenceEnd = text.lastIndexOf('.', end);
        if (sentenceEnd > start + chunkSize / 2) {
          end = sentenceEnd + 1;
        }
      } else {
        end = text.length;
      }

      const chunkText = text.slice(start, end).trim();
      if (chunkText.length > 0) {
        chunks.push({ text: chunkText, start, end });
      }

      start = end - chunkOverlap;
      if (start >= text.length) break;
    }

    return chunks;
  }

  /**
   * Convert search result to evidence chunk
   */
  private toEvidenceChunk(result: SearchResult, tenantId: string): EvidenceChunk {
    const citation: CitationSource = {
      id: uuidv4(),
      documentId: result.chunk.documentId,
      documentTitle: result.chunk.documentTitle,
      spanStart: result.chunk.spanStart,
      spanEnd: result.chunk.spanEnd,
      content: result.chunk.content,
      confidence: result.similarity,
      sourceType: 'document',
      metadata: result.chunk.metadata,
    };

    return {
      id: uuidv4(),
      content: result.chunk.content,
      embedding: result.chunk.embedding,
      citations: [citation],
      graphPaths: [],
      relevanceScore: result.similarity,
      tenantId,
    };
  }

  /**
   * Simple hash function for cache keys
   */
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
    }
  }
}
