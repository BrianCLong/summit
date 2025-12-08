import { IRetrievalService } from './interfaces.js';
import { KnowledgeObject, RetrievalQuery, RetrievalResult, RetrievalResultItem } from './types.js';
import { KnowledgeRepository } from './KnowledgeRepository.js';
import EmbeddingService from '../services/EmbeddingService.js';
import { Pool } from 'pg';
import logger from '../utils/logger.js';
import crypto from 'crypto';

export class RetrievalService implements IRetrievalService {
  private repo: KnowledgeRepository;
  private embeddingService: EmbeddingService;

  constructor(pool: Pool) {
    this.repo = new KnowledgeRepository(pool);
    // EmbeddingService reads env vars internally
    this.embeddingService = new EmbeddingService();
  }

  async search(query: RetrievalQuery): Promise<RetrievalResult> {
    const startTime = Date.now();
    let items: RetrievalResultItem[] = [];

    try {
      if (query.queryKind === 'semantic') {
        const embedding = await this.embeddingService.generateEmbedding({ text: query.queryText });
        items = await this.repo.searchVector(query, embedding);
      } else if (query.queryKind === 'keyword') {
        items = await this.repo.searchKeyword(query);
      } else if (query.queryKind === 'hybrid') {
        // Simple hybrid: run both, merge and deduplicate
        // Note: For production, we'd want RRF (Reciprocal Rank Fusion) or weighted sum.
        // For MVP, we'll fetch topK from both and merge based on score.
        // However, scores are not directly comparable (cosine vs ts_rank).

        const embedding = await this.embeddingService.generateEmbedding({ text: query.queryText });
        const [vectorResults, keywordResults] = await Promise.all([
          this.repo.searchVector(query, embedding),
          this.repo.searchKeyword(query)
        ]);

        // Basic Merge Strategy:
        // 1. Normalize scores? (Hard without stats).
        // 2. Simple deduplication favoring vector score if present?

        const resultMap = new Map<string, RetrievalResultItem>();

        // Add vector results
        vectorResults.forEach(r => {
           resultMap.set(r.object.id, r);
        });

        // Add keyword results, maybe boosting if it appears in both?
        keywordResults.forEach(r => {
           if (resultMap.has(r.object.id)) {
             // exists in both. Boost score?
             const existing = resultMap.get(r.object.id)!;
             // Naive boost: existing.score is cosine (0-1). keyword score is open-ended.
             // We'll just keep the vector result as primary but maybe mark it?
             existing.score += 0.1; // arbitrary small boost
           } else {
             resultMap.set(r.object.id, r);
           }
        });

        items = Array.from(resultMap.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, query.topK || 10);
      }

      // Filter content if not requested
      if (query.includeContent === false) {
        items.forEach(item => {
          delete item.object.body;
        });
      }

    } catch (err) {
      logger.error(`Retrieval search failed: ${err}`);
      // Return empty results rather than blowing up, but log error
    }

    return {
      tenantId: query.tenantId,
      query,
      items
    };
  }

  async indexObject(object: KnowledgeObject): Promise<void> {
    // 1. Upsert object
    await this.repo.upsertKnowledgeObject(object);

    // 2. Generate embedding if body exists
    if (object.body) {
      try {
        const vector = await this.embeddingService.generateEmbedding({ text: object.title ? `${object.title} ${object.body}` : object.body });

        // 3. Store embedding
        await this.repo.upsertEmbedding({
          // Use a deterministic ID for the embedding so we can update it in place
          id: `emb_${object.id}`,
          tenantId: object.tenantId,
          objectId: object.id,
          kind: object.kind,
          provider: this.embeddingService.config.provider,
          model: this.embeddingService.config.model,
          dim: vector.length,
          vector: vector,
          createdAt: new Date().toISOString(),
          version: 'v1'
        });
      } catch (err) {
        logger.error(`Failed to generate/store embedding for ${object.id}: ${err}`);
      }
    }
  }

  async deleteObject(tenantId: string, objectId: string): Promise<void> {
    await this.repo.deleteObject(tenantId, objectId);
  }
}
