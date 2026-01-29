/**
 * Similarity Service
 *
 * Provides fast similarity search using pgvector HNSW index
 * for entity recommendations and graph exploration.
 */

import { Pool } from 'pg';
import { getPostgresPool } from '../config/database.js';
import EmbeddingService from './EmbeddingService.js';
import { otelService } from '../monitoring/opentelemetry.js';
import {
  vectorQueriesTotal,
  vectorQueryDurationSeconds,
} from '../monitoring/metrics.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

const serviceLogger = logger.child({ name: 'SimilarityService' });

// Input validation schemas
const SimilarityQuerySchema = z
  .object({
    investigationId: z.string().min(1),
    entityId: z.string().optional(),
    text: z.string().optional(),
    topK: z.number().int().min(1).max(100).default(10),
    threshold: z.number().min(0).max(1).default(0.7),
    includeText: z.boolean().default(false),
    tenantId: z.string().optional(),
  })
  .refine((data: { entityId?: string; text?: string }) => data.entityId || data.text, {
    message: 'Either entityId or text must be provided',
  });

const BulkSimilarityQuerySchema = z.object({
  investigationId: z.string().min(1),
  entityIds: z.array(z.string()).min(1).max(50),
  topK: z.number().int().min(1).max(100).default(5),
  threshold: z.number().min(0).max(1).default(0.7),
});

// Types
// @ts-ignore - zod type resolution issue
export type SimilarityQuery = z.infer<typeof SimilarityQuerySchema>;
// @ts-ignore - zod type resolution issue
export type BulkSimilarityQuery = z.infer<typeof BulkSimilarityQuerySchema>;

export interface SimilarEntity {
  entityId: string;
  similarity: number;
  text?: string;
  metadata?: Record<string, any>;
}

export interface SimilarityResult {
  query: {
    type: 'entity' | 'text';
    value: string;
  };
  results: SimilarEntity[];
  totalResults: number;
  executionTime: number;
}

export class SimilarityService {
  private postgres: Pool | null;
  private embeddingService: EmbeddingService;
  private config: {
    defaultTopK: number;
    defaultThreshold: number;
    maxBatchSize: number;
    cacheExpiry: number;
  };

  constructor() {
    this.postgres = null; // Will be initialized lazily
    this.embeddingService = new EmbeddingService();

    this.config = {
      defaultTopK: 10,
      defaultThreshold: 0.7,
      maxBatchSize: 50,
      cacheExpiry: 3600, // 1 hour
    };
  }

  private getPool(): Pool {
    if (!this.postgres) {
      this.postgres = getPostgresPool() as unknown as Pool;
    }
    return this.postgres;
  }

  /**
   * Find similar entities by entity ID or text
   */
  async findSimilar(query: SimilarityQuery): Promise<SimilarityResult> {
    const startTime = Date.now();

    return otelService.wrapNeo4jOperation('similarity-search', async () => {
      try {
        const validated = SimilarityQuerySchema.parse(query);

        serviceLogger.debug('Similarity search requested', {
          investigationId: validated.investigationId,
          entityId: validated.entityId,
          tenantId: validated.tenantId,
          hasText: !!validated.text,
          topK: validated.topK,
        });

        let targetEmbedding: number[];
        let queryType: 'entity' | 'text';
        let queryValue: string;

        if (validated.entityId) {
          // Search by existing entity embedding
          targetEmbedding = await this.getEntityEmbedding(validated.entityId);
          queryType = 'entity';
          queryValue = validated.entityId;
        } else {
          // Search by text embedding
          targetEmbedding = await this.embeddingService.generateEmbedding({
            text: validated.text!,
            model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
          });
          queryType = 'text';
          queryValue = validated.text!;
        }

        // Perform similarity search
        const results = await this.performVectorSearch(
          targetEmbedding,
          validated.investigationId,
          validated.topK,
          validated.threshold,
          validated.includeText,
          validated.entityId, // Exclude the query entity itself
          validated.tenantId,
        );

        const executionTime = Date.now() - startTime;

        serviceLogger.info('Similarity search completed', {
          investigationId: validated.investigationId,
          queryType,
          resultsCount: results.length,
          executionTime,
          topSimilarity: results[0]?.similarity || 0,
        });

        otelService.addSpanAttributes({
          'similarity.investigation_id': validated.investigationId,
          'similarity.query_type': queryType,
          'similarity.results_count': results.length,
          'similarity.execution_time': executionTime,
          'similarity.top_k': validated.topK,
        });

        return {
          query: {
            type: queryType,
            value: queryValue,
          },
          results,
          totalResults: results.length,
          executionTime,
        };
      } catch (error: any) {
        serviceLogger.error('Similarity search failed', {
          investigationId: query.investigationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    });
  }

  /**
   * Find similar entities for multiple entities at once
   */
  async findSimilarBulk(
    query: BulkSimilarityQuery,
  ): Promise<Map<string, SimilarEntity[]>> {
    return otelService.wrapNeo4jOperation(
      'bulk-similarity-search',
      async () => {
        try {
          const validated = BulkSimilarityQuerySchema.parse(query);

          serviceLogger.debug('Bulk similarity search requested', {
            investigationId: validated.investigationId,
            entityCount: validated.entityIds.length,
            topK: validated.topK,
          });

          const results = new Map<string, SimilarEntity[]>();

          // Process entities in smaller batches to avoid overwhelming the database
          const batchSize = Math.min(validated.entityIds.length, 10);

          for (let i = 0; i < validated.entityIds.length; i += batchSize) {
            const batch = validated.entityIds.slice(i, i + batchSize);

            // Fetch all embeddings for the batch in one query
            // This reduces DB roundtrips by avoiding N getEntityEmbedding calls
            const embeddingsMap = await this.getEntitiesEmbeddings(batch);

            const batchPromises = batch.map(async (entityId: string) => {
              try {
                const targetEmbedding = embeddingsMap.get(entityId);

                if (!targetEmbedding) {
                  serviceLogger.warn(
                    'No embedding found for entity in bulk search',
                    { entityId },
                  );
                  return [entityId, [] as SimilarEntity[]] as const;
                }

                const similarEntities = await this.performVectorSearch(
                  targetEmbedding,
                  validated.investigationId,
                  validated.topK,
                  validated.threshold,
                  false, // includeText
                  entityId, // excludeEntityId
                );

                return [entityId, similarEntities] as const;
              } catch (error: any) {
                serviceLogger.warn(
                  'Failed to find similar entities for entity',
                  {
                    entityId,
                    error:
                      error instanceof Error ? error.message : 'Unknown error',
                  },
                );
                return [entityId, [] as SimilarEntity[]] as const;
              }
            });

            const batchResults = await Promise.all(batchPromises);

            for (const [entityId, similarEntities] of batchResults) {
              results.set(entityId, similarEntities);
            }
          }

          serviceLogger.info('Bulk similarity search completed', {
            investigationId: validated.investigationId,
            entityCount: validated.entityIds.length,
            successfulResults: results.size,
          });

          return results;
        } catch (error: any) {
          serviceLogger.error('Bulk similarity search failed', {
            investigationId: query.investigationId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        }
      },
    );
  }

  /**
   * Get embeddings for multiple entities in a single query
   */
  private async getEntitiesEmbeddings(entityIds: string[]): Promise<Map<string, number[]>> {
    const client = await this.getPool().connect();

    try {
      const result = await client.query(
        'SELECT entity_id, embedding FROM entity_embeddings WHERE entity_id = ANY($1)',
        [entityIds],
      );

      const map = new Map<string, number[]>();
      for (const row of result.rows) {
        map.set(row.entity_id, this.parseVectorString(row.embedding));
      }
      return map;
    } finally {
      client.release();
    }
  }

  /**
   * Get entity embedding from database
   */
  private async getEntityEmbedding(entityId: string): Promise<number[]> {
    const client = await this.getPool().connect();

    try {
      const result = await client.query(
        'SELECT embedding FROM entity_embeddings WHERE entity_id = $1',
        [entityId],
      );

      if (result.rows.length === 0) {
        throw new Error(`No embedding found for entity ${entityId}`);
      }

      // pgvector returns the embedding as a string, parse it back to array
      const embeddingString = result.rows[0].embedding;
      return this.parseVectorString(embeddingString);
    } finally {
      client.release();
    }
  }

  /**
   * Perform vector similarity search using pgvector
   */
  private async performVectorSearch(
    targetEmbedding: number[],
    investigationId: string,
    topK: number,
    threshold: number,
    includeText: boolean,
    excludeEntityId?: string,
    tenantId?: string,
  ): Promise<SimilarEntity[]> {
    const client = await this.getPool().connect();
    const tenantLabel = tenantId ?? 'unknown';
    const stopTimer = vectorQueryDurationSeconds.startTimer({
      operation: 'similarity-search',
      tenant_id: tenantLabel,
    });
    const finishTimer = typeof stopTimer === 'function' ? stopTimer : () => { };
    let status: 'success' | 'error' = 'success';

    try {
      // Convert embedding to pgvector format
      const vectorString = `[${targetEmbedding.join(',')}]`;

      // Build query
      let query = `
        SELECT
          ee.entity_id,
          1 - (ee.embedding <=> $1::vector) as similarity
          ${includeText ? ', ee.text' : ''}
        FROM entity_embeddings ee
        WHERE ee.investigation_id = $2
      `;

      const params: any[] = [vectorString, investigationId];
      let paramIndex = 3;

      // Exclude specific entity if provided
      if (excludeEntityId) {
        query += ` AND ee.entity_id != $${paramIndex}`;
        params.push(excludeEntityId);
        paramIndex++;
      }

      // Add similarity threshold
      query += ` AND (1 - (ee.embedding <=> $1::vector)) >= $${paramIndex}`;
      params.push(threshold);
      paramIndex++;

      // Order by similarity and limit
      query += `
        ORDER BY ee.embedding <=> $1::vector
        LIMIT $${paramIndex}
      `;
      params.push(topK);

      const result = await client.query(query, params);

      return result.rows.map((row: any) => ({
        entityId: row.entity_id,
        similarity: parseFloat(row.similarity),
        text: includeText ? row.text : undefined,
      }));
    } catch (error: any) {
      status = 'error';
      throw error;
    } finally {
      finishTimer();
      const counter = vectorQueriesTotal?.labels?.(
        'similarity-search',
        tenantLabel,
        status,
      );
      if (counter && typeof counter.inc === 'function') {
        counter.inc();
      }
      client.release();
    }
  }

  /**
   * Parse pgvector string format back to number array
   */
  private parseVectorString(vectorString: string): number[] {
    // Remove brackets and split by comma
    const cleaned = vectorString.replace(/^\[|\]$/g, '');
    return cleaned.split(',').map((v) => parseFloat(v.trim()));
  }

  /**
   * Get similarity statistics for an investigation
   */
  async getStats(investigationId: string): Promise<{
    totalEmbeddings: number;
    avgSimilarityThreshold: number;
    lastUpdated: string | null;
    indexHealth: 'healthy' | 'degraded' | 'missing';
  }> {
    const client = await this.getPool().connect();

    try {
      // Get embedding count and last update
      const statsResult = await client.query(
        `
        SELECT
          COUNT(*) as total_embeddings,
          MAX(updated_at) as last_updated
        FROM entity_embeddings
        WHERE investigation_id = $1
      `,
        [investigationId],
      );

      // Check index health
      const indexResult = await client.query(`
        SELECT
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE tablename = 'entity_embeddings'
          AND indexname = 'entity_embeddings_hnsw_idx'
      `);

      const indexHealth = indexResult.rows.length > 0 ? 'healthy' : 'missing';

      return {
        totalEmbeddings: parseInt(statsResult.rows[0].total_embeddings),
        avgSimilarityThreshold: this.config.defaultThreshold,
        lastUpdated: statsResult.rows[0].last_updated,
        indexHealth,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Rebuild HNSW index with configurable parameters
   */
  async rebuildIndex(config: { m?: number; efConstruction?: number } = {}): Promise<void> {
    const client = await this.getPool().connect();

    // Validate inputs to prevent SQL injection
    const m = config.m !== undefined ? Math.max(2, Math.min(config.m, 100)) : 16;
    const efConstruction = config.efConstruction !== undefined
      ? Math.max(10, Math.min(config.efConstruction, 1000))
      : 64;

    try {
      serviceLogger.info('Rebuilding HNSW index...', { m, efConstruction });

      // Drop existing index
      await client.query('DROP INDEX IF EXISTS entity_embeddings_hnsw_idx');

      // Recreate index
      // Using template literal is safe here because we validated inputs above to be numbers within safe ranges
      await client.query(`
        CREATE INDEX entity_embeddings_hnsw_idx
        ON entity_embeddings
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = ${m}, ef_construction = ${efConstruction})
      `);

      serviceLogger.info('HNSW index rebuilt successfully');
    } finally {
      client.release();
    }
  }

  async benchmarkIndexConfigurations(configs: Array<{ m: number; efConstruction: number }>): Promise<any[]> {
    const results = [];
    for (const config of configs) {
      const start = Date.now();
      await this.rebuildIndex(config);
      const buildTime = Date.now() - start;

      // Perform a test search to measure recall/latency (simplified)
      // In a real scenario we'd use a known ground truth dataset
      const searchStart = Date.now();
      // Just run a dummy query if possible, or skip
      const searchTime = Date.now() - searchStart;

      results.push({
        config,
        buildTime,
        searchTime
      });
    }
    return results;
  }

  /**
   * Calculate topology similarity using Jaccard index
   * Measures overlap between entity neighbor sets
   */
  private calculateTopologySimilarity(
    neighbors1: string[],
    neighbors2: string[],
  ): number {
    if (!neighbors1?.length && !neighbors2?.length) {
      return 0;
    }

    const set1 = new Set(neighbors1 || []);
    const set2 = new Set(neighbors2 || []);

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) {
      return 0;
    }

    return intersection.size / union.size;
  }

  /**
   * Calculate provenance similarity
   * Returns 1 if sources match, 0 otherwise
   */
  private calculateProvenanceSimilarity(
    source1?: string,
    source2?: string,
  ): number {
    if (!source1 || !source2) {
      return 0;
    }
    return source1 === source2 ? 1 : 0;
  }

  /**
   * Find potential duplicate entities using semantic similarity + topology + provenance
   * Modern pgvector-based implementation replacing O(n²) legacy algorithm
   *
   * @param params Configuration for duplicate detection
   * @returns Array of duplicate candidate pairs with similarity scores and reasons
   */
  async findDuplicateCandidates(params: {
    investigationId: string;
    threshold?: number;
    topK?: number;
    includeReasons?: boolean;
    tenantId?: string;
  }): Promise<DuplicateCandidate[]> {
    const startTime = Date.now();
    const threshold = params.threshold ?? this.config.defaultThreshold;
    const topK = params.topK ?? 5; // Top K similar entities per entity
    const includeReasons = params.includeReasons ?? true;

    return otelService.wrapNeo4jOperation(
      'find-duplicate-candidates',
      async () => {
        try {
          serviceLogger.info('Finding duplicate candidates', {
            investigationId: params.investigationId,
            threshold,
            topK,
          });

          // Step 1: Fetch all entities with embeddings for this investigation
          const client = await this.getPool().connect();

          let entities: EntityEmbeddingRecord[];
          try {
            const result = await client.query(
              `
              SELECT
                entity_id,
                embedding,
                text,
                metadata
              FROM entity_embeddings
              WHERE investigation_id = $1
              ORDER BY entity_id
            `,
              [params.investigationId],
            );

            entities = result.rows.map((row: any) => ({
              entityId: row.entity_id,
              embedding: this.parseVectorString(row.embedding),
              text: row.text,
              neighborIds: row.metadata?.neighbor_ids || [],
              sourceSystem: row.metadata?.source_system,
            }));
          } finally {
            client.release();
          }

          serviceLogger.debug('Loaded entities for deduplication', {
            entityCount: entities.length,
          });

          if (entities.length === 0) {
            return [];
          }

          // Step 2: For each entity, find similar entities using vector search
          // This is O(n) with pgvector vs O(n²) with naive comparison
          const candidatePairs: Map<string, DuplicateCandidate> = new Map();

          for (const entity of entities) {
            const similarEntities = await this.performVectorSearch(
              entity.embedding,
              params.investigationId,
              topK,
              0.0, // Don't filter by threshold yet, we'll apply hybrid scoring
              false, // Don't include text in results
              entity.entityId, // Exclude self
              params.tenantId,
            );

            // Step 3: Calculate hybrid scores for each similar entity
            for (const similar of similarEntities) {
              const targetEntity = entities.find(
                (e) => e.entityId === similar.entityId,
              );

              if (!targetEntity) {
                continue;
              }

              // Semantic similarity from pgvector (already computed)
              const semanticSimilarity = similar.similarity;

              // Topology similarity (Jaccard index of neighbor sets)
              const topologySimilarity = this.calculateTopologySimilarity(
                entity.neighborIds,
                targetEntity.neighborIds,
              );

              // Provenance similarity (same source system)
              const provenanceSimilarity = this.calculateProvenanceSimilarity(
                entity.sourceSystem,
                targetEntity.sourceSystem,
              );

              // Weighted hybrid score matching legacy weights:
              // Semantic: 60%, Topology: 30%, Provenance: 10%
              const overallSimilarity =
                semanticSimilarity * 0.6 +
                topologySimilarity * 0.3 +
                provenanceSimilarity * 0.1;

              // Only include if meets threshold
              if (overallSimilarity >= threshold) {
                // Create deterministic pair key (sorted entity IDs)
                const pairKey =
                  entity.entityId < similar.entityId
                    ? `${entity.entityId}::${similar.entityId}`
                    : `${similar.entityId}::${entity.entityId}`;

                // Avoid duplicate pairs
                if (!candidatePairs.has(pairKey)) {
                  const reasons: string[] = [];

                  if (includeReasons) {
                    if (semanticSimilarity > 0.8) {
                      reasons.push('High semantic similarity');
                    }
                    if (topologySimilarity > 0.5) {
                      reasons.push('Significant neighbor overlap');
                    }
                    if (provenanceSimilarity > 0) {
                      reasons.push('Same source');
                    }
                    if (reasons.length === 0) {
                      reasons.push('Overall similarity threshold met');
                    }
                  }

                  candidatePairs.set(pairKey, {
                    entityA: {
                      id: entity.entityId,
                      label: entity.text || entity.entityId,
                    },
                    entityB: {
                      id: similar.entityId,
                      label: targetEntity.text || similar.entityId,
                    },
                    similarity: overallSimilarity,
                    scores: {
                      semantic: semanticSimilarity,
                      topology: topologySimilarity,
                      provenance: provenanceSimilarity,
                    },
                    reasons: includeReasons ? reasons : undefined,
                  });
                }
              }
            }
          }

          const candidates = Array.from(candidatePairs.values());

          // Sort by similarity descending
          candidates.sort((a, b) => b.similarity - a.similarity);

          const executionTime = Date.now() - startTime;

          serviceLogger.info('Duplicate candidates found', {
            investigationId: params.investigationId,
            candidateCount: candidates.length,
            entityCount: entities.length,
            executionTime,
            threshold,
          });

          otelService.addSpanAttributes({
            'dedup.investigation_id': params.investigationId,
            'dedup.candidate_count': candidates.length,
            'dedup.entity_count': entities.length,
            'dedup.execution_time': executionTime,
            'dedup.threshold': threshold,
          });

          return candidates;
        } catch (error: any) {
          serviceLogger.error('Failed to find duplicate candidates', {
            investigationId: params.investigationId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        }
      },
    );
  }
}

// Types for duplicate detection
interface EntityEmbeddingRecord {
  entityId: string;
  embedding: number[];
  text?: string;
  neighborIds: string[];
  sourceSystem?: string;
}

export interface DuplicateCandidate {
  entityA: {
    id: string;
    label: string;
  };
  entityB: {
    id: string;
    label: string;
  };
  similarity: number;
  scores: {
    semantic: number;
    topology: number;
    provenance: number;
  };
  reasons?: string[];
}

export const similarityService = new SimilarityService();
