
import { getNeo4jDriver } from '../db/neo4j.js';
import EmbeddingService from './EmbeddingService.js';
import logger from '../utils/logger.js';
import { applicationErrors } from '../monitoring/metrics.js';

interface GraphEmbeddingConfig {
  embeddingService?: EmbeddingService;
  nodeLabel?: string;
  embeddingProperty?: string;
  batchSize?: number;
}

export class GraphEmbeddingService {
  private embeddingService: EmbeddingService;
  private nodeLabel: string;
  private embeddingProperty: string;
  private batchSize: number;

  constructor(config: GraphEmbeddingConfig = {}) {
    this.embeddingService = config.embeddingService || new EmbeddingService();
    this.nodeLabel = config.nodeLabel || 'Entity';
    this.embeddingProperty = config.embeddingProperty || 'embedding';
    this.batchSize = config.batchSize || 50;
  }

  /**
   * Compute and store embeddings for nodes in a tenant
   * This respects tenant isolation by only querying nodes with the matching tenantId
   * Uses keyset pagination (cursor-based) for performance and correctness.
   */
  async computeAndStoreNodeEmbeddings(
    tenantId: string,
    options: { forceUpdate?: boolean; dryRun?: boolean } = {}
  ): Promise<{ processed: number; errors: number; skipped: number }> {
    const { forceUpdate = false, dryRun = false } = options;
    const driver = getNeo4jDriver();
    const session = driver.session();

    let processed = 0;
    let errors = 0;
    let skipped = 0;

    try {
      logger.info('Starting graph embedding computation', { tenantId, forceUpdate, dryRun });

      // 1. Fetch nodes that need embeddings
      // We process in batches to avoid memory issues
      // Using Keyset Pagination (Cursor based on ID)
      let hasMore = true;
      let lastId: string | null = null;

      while (hasMore) {
        // Find nodes for this tenant that need update:
        // 1. Embedding is missing (and not skipped, OR skipped but updated recently)
        // 2. OR forceUpdate is true
        // 3. OR Node has been updated since last embedding/skip (n.updatedAt > n.embedding_updatedAt)
        // AND have some text content to embed (e.g., description, name, or serialized attributes)

        // Revised Logic for SKIPPED nodes:
        // A node is eligible if:
        // - forceUpdate is true
        // - OR embedding is NULL
        //   - AND (status IS NULL OR status != 'SKIPPED' OR (updatedAt > embedding_updatedAt))
        // - OR (updatedAt > embedding_updatedAt) - This covers both completed and skipped nodes that were updated.

        // Simplified:
        // Eligible if:
        // $forceUpdate
        // OR n.embedding IS NULL AND (n.embedding_status IS NULL OR n.embedding_status <> 'SKIPPED')
        // OR (n.updatedAt > n.embedding_updatedAt) -- This implies if it was SKIPPED (embedding_updatedAt set) but then updated (updatedAt > embedding_updatedAt), it qualifies.

        const whereClause = `
          WHERE
            (
                $forceUpdate
                OR (n.${this.embeddingProperty} IS NULL AND (n.embedding_status IS NULL OR n.embedding_status <> 'SKIPPED'))
                OR (n.updatedAt IS NOT NULL AND n.${this.embeddingProperty}_updatedAt IS NOT NULL AND n.updatedAt > n.${this.embeddingProperty}_updatedAt)
            )
          AND (n.description IS NOT NULL OR n.name IS NOT NULL)
          ${lastId !== null ? 'AND n.id > $lastId' : ''}
        `;

        const fetchCypher = `
          MATCH (n:${this.nodeLabel} {tenantId: $tenantId})
          ${whereClause}
          RETURN n.id as id, n.name as name, n.description as description, n.tenantId as tenantId
          ORDER BY n.id ASC
          LIMIT $batchSize
        `;

        const result = await session.run(fetchCypher, {
          tenantId,
          forceUpdate,
          lastId,
          batchSize: this.batchSize
        });

        if (result.records.length === 0) {
          hasMore = false;
          break;
        }

        // Update cursor
        const lastRecord = result.records[result.records.length - 1];
        lastId = lastRecord.get('id');

        const batchNodes = result.records.map(r => ({
          id: r.get('id'),
          name: r.get('name'),
          description: r.get('description'),
          text: this.prepareEmbeddingText(r.get('name'), r.get('description'))
        }));

        // 2. Compute embeddings
        const textsToEmbed = batchNodes.map(n => n.text);

        const validIndices: number[] = [];
        const validTexts: string[] = [];
        const skippedIndices: number[] = [];

        textsToEmbed.forEach((text, idx) => {
            if (text && text.trim().length > 0) {
                validIndices.push(idx);
                validTexts.push(text);
            } else {
                skippedIndices.push(idx);
                skipped++;
            }
        });

        if (validTexts.length > 0) {
             try {
                // Generate embeddings in batch
                const embeddings = await this.embeddingService.generateEmbeddings(validTexts);

                if (!dryRun) {
                    // 3. Store embeddings back to graph
                    const updates = validIndices.map((originalIdx, i) => ({
                        id: batchNodes[originalIdx].id,
                        embedding: embeddings[i]
                    }));

                    const writeCypher = `
                        UNWIND $updates as update
                        MATCH (n:${this.nodeLabel} {id: update.id, tenantId: $tenantId})
                        SET n.${this.embeddingProperty} = update.embedding,
                            n.${this.embeddingProperty}_model = $model,
                            n.${this.embeddingProperty}_version = $version,
                            n.${this.embeddingProperty}_updatedAt = datetime(),
                            n.embedding_status = 'COMPLETED'
                    `;

                    await session.run(writeCypher, {
                        tenantId,
                        updates,
                        model: this.embeddingService.config.model,
                        version: 'v1' // TODO: Version management
                    });
                }

                processed += validTexts.length;
            } catch (err: any) {
                logger.error('Failed to generate/store embeddings for batch', { error: err.message });
                errors += validTexts.length;
                applicationErrors.labels('graph_embedding_service', 'BatchProcessingError', 'error').inc();
            }
        }

        // Handle skipped nodes - mark them to avoid re-fetching
        if (skippedIndices.length > 0 && !dryRun) {
             const updates = skippedIndices.map((originalIdx) => ({
                 id: batchNodes[originalIdx].id
             }));

             const skipCypher = `
                UNWIND $updates as update
                MATCH (n:${this.nodeLabel} {id: update.id, tenantId: $tenantId})
                SET n.embedding_status = 'SKIPPED',
                    n.${this.embeddingProperty}_updatedAt = datetime()
             `;

             await session.run(skipCypher, {
                 tenantId,
                 updates
             });
        }
      }

    } catch (error: any) {
      logger.error('Graph embedding service error', { error: error.message, tenantId });
      throw error;
    } finally {
      await session.close();
    }

    logger.info('Completed graph embedding computation', { tenantId, processed, errors, skipped });
    return { processed, errors, skipped };
  }

  private prepareEmbeddingText(name: string | null, description: string | null): string {
    const parts = [];
    if (name) parts.push(name);
    if (description) parts.push(description);
    return parts.join(': ');
  }
}
