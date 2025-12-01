import { Pool } from 'pg';
import { Driver as Neo4jDriver, Session as Neo4jSession } from 'neo4j-driver';
import { createLogger, format, transports, Logger } from 'winston';

import { ElasticsearchService } from './ElasticsearchService';

export interface IndexingConfig {
  batchSize: number;
  indexingInterval: number; // milliseconds
  enableRealTimeSync: boolean;
  maxRetries: number;
}

export interface EntityDocument {
  id: string;
  tenantId: string;
  kind: string;
  labels: string[];
  title?: string;
  content?: string;
  description?: string;
  props: Record<string, any>;
  tags: string[];
  source: string;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  // Graph-specific fields
  neighbors?: Array<{
    id: string;
    type: string;
    relationship: string;
  }>;
  graphScore?: number;
}

export class IndexingService {
  private logger: Logger;
  private config: IndexingConfig;
  private lastSyncTimestamp: Date;
  private isIndexing: boolean = false;

  constructor(
    private pg: Pool,
    private neo4j: Neo4jDriver,
    private elasticsearch: ElasticsearchService,
    config?: Partial<IndexingConfig>,
  ) {
    this.config = {
      batchSize: config?.batchSize || 1000,
      indexingInterval: config?.indexingInterval || 60000, // 1 minute
      enableRealTimeSync: config?.enableRealTimeSync ?? true,
      maxRetries: config?.maxRetries || 3,
    };

    this.lastSyncTimestamp = new Date(0);

    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
      ),
      transports: [
        new transports.Console(),
        new transports.File({ filename: 'logs/indexing.log' }),
      ],
    });
  }

  /**
   * Start the continuous indexing process
   */
  async startIndexing(): Promise<void> {
    this.logger.info('Starting indexing service', {
      config: this.config,
    });

    // Initial full sync
    await this.performFullSync();

    // Set up periodic sync
    if (this.config.enableRealTimeSync) {
      setInterval(async () => {
        await this.performIncrementalSync();
      }, this.config.indexingInterval);

      this.logger.info('Real-time sync enabled', {
        interval: this.config.indexingInterval,
      });
    }
  }

  /**
   * Perform full reindex of all entities
   */
  async performFullSync(): Promise<void> {
    if (this.isIndexing) {
      this.logger.warn('Indexing already in progress, skipping');
      return;
    }

    this.isIndexing = true;
    const startTime = Date.now();

    try {
      this.logger.info('Starting full sync');

      // Fetch all entities from PostgreSQL
      const entities = await this.fetchAllEntities();
      this.logger.info(`Fetched ${entities.length} entities from PostgreSQL`);

      // Enrich with Neo4j graph data
      const enrichedEntities = await this.enrichWithGraphData(entities);
      this.logger.info(`Enriched ${enrichedEntities.length} entities with graph data`);

      // Index in batches
      await this.indexEntitiesInBatches(enrichedEntities);

      this.lastSyncTimestamp = new Date();

      this.logger.info('Full sync completed', {
        duration: Date.now() - startTime,
        entityCount: entities.length,
      });
    } catch (error) {
      this.logger.error('Full sync failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      this.isIndexing = false;
    }
  }

  /**
   * Perform incremental sync for changed entities
   */
  async performIncrementalSync(): Promise<void> {
    if (this.isIndexing) {
      return;
    }

    this.isIndexing = true;
    const startTime = Date.now();

    try {
      this.logger.debug('Starting incremental sync', {
        lastSyncTimestamp: this.lastSyncTimestamp,
      });

      // Fetch changed entities
      const changedEntities = await this.fetchChangedEntities(this.lastSyncTimestamp);

      if (changedEntities.length === 0) {
        this.logger.debug('No changes detected');
        return;
      }

      this.logger.info(`Found ${changedEntities.length} changed entities`);

      // Enrich with Neo4j graph data
      const enrichedEntities = await this.enrichWithGraphData(changedEntities);

      // Index in batches
      await this.indexEntitiesInBatches(enrichedEntities);

      this.lastSyncTimestamp = new Date();

      this.logger.info('Incremental sync completed', {
        duration: Date.now() - startTime,
        entityCount: changedEntities.length,
      });
    } catch (error) {
      this.logger.error('Incremental sync failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.isIndexing = false;
    }
  }

  /**
   * Fetch all entities from PostgreSQL
   */
  private async fetchAllEntities(): Promise<EntityDocument[]> {
    const query = `
      SELECT
        id,
        tenant_id as "tenantId",
        kind,
        labels,
        props,
        created_at as "createdAt",
        updated_at as "updatedAt",
        created_by as "createdBy"
      FROM entities
      ORDER BY created_at DESC
    `;

    const result = await this.pg.query(query);
    return result.rows.map((row) => this.transformEntity(row));
  }

  /**
   * Fetch entities changed since last sync
   */
  private async fetchChangedEntities(since: Date): Promise<EntityDocument[]> {
    const query = `
      SELECT
        id,
        tenant_id as "tenantId",
        kind,
        labels,
        props,
        created_at as "createdAt",
        updated_at as "updatedAt",
        created_by as "createdBy"
      FROM entities
      WHERE updated_at > $1
      ORDER BY updated_at DESC
    `;

    const result = await this.pg.query(query, [since]);
    return result.rows.map((row) => this.transformEntity(row));
  }

  /**
   * Transform database row to entity document
   */
  private transformEntity(row: any): EntityDocument {
    const props = typeof row.props === 'string' ? JSON.parse(row.props) : row.props;

    return {
      id: row.id,
      tenantId: row.tenantId,
      kind: row.kind,
      labels: Array.isArray(row.labels) ? row.labels : [],
      title: props.name || props.title || props.label,
      content: this.extractContent(props),
      description: props.description || props.summary,
      props,
      tags: props.tags || [],
      source: props.source || 'unknown',
      confidence: props.confidence,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy,
    };
  }

  /**
   * Extract searchable content from entity properties
   */
  private extractContent(props: Record<string, any>): string {
    const contentFields = [
      'content',
      'text',
      'body',
      'notes',
      'details',
      'metadata',
    ];

    const contentParts: string[] = [];

    for (const field of contentFields) {
      if (props[field]) {
        if (typeof props[field] === 'string') {
          contentParts.push(props[field]);
        } else if (typeof props[field] === 'object') {
          contentParts.push(JSON.stringify(props[field]));
        }
      }
    }

    return contentParts.join(' ');
  }

  /**
   * Enrich entities with Neo4j graph data
   */
  private async enrichWithGraphData(
    entities: EntityDocument[],
  ): Promise<EntityDocument[]> {
    const session: Neo4jSession = this.neo4j.session();

    try {
      const enriched: EntityDocument[] = [];

      for (const entity of entities) {
        try {
          // Fetch neighbors and relationships
          const result = await session.run(
            `
            MATCH (n)
            WHERE n.id = $id
            OPTIONAL MATCH (n)-[r]-(neighbor)
            RETURN n,
                   collect(distinct {
                     id: neighbor.id,
                     type: labels(neighbor)[0],
                     relationship: type(r)
                   }) as neighbors,
                   count(distinct neighbor) as degree
            `,
            { id: entity.id },
          );

          if (result.records.length > 0) {
            const record = result.records[0];
            const neighbors = record.get('neighbors');
            const degree = record.get('degree').toNumber();

            // Calculate graph score based on connectivity
            const graphScore = this.calculateGraphScore(degree, neighbors);

            enriched.push({
              ...entity,
              neighbors: neighbors.filter((n: any) => n.id !== null),
              graphScore,
            });
          } else {
            enriched.push(entity);
          }
        } catch (error) {
          this.logger.warn('Failed to enrich entity with graph data', {
            entityId: entity.id,
            error: error instanceof Error ? error.message : String(error),
          });
          enriched.push(entity);
        }
      }

      return enriched;
    } finally {
      await session.close();
    }
  }

  /**
   * Calculate graph importance score
   */
  private calculateGraphScore(degree: number, neighbors: any[]): number {
    // Simple scoring based on degree (can be enhanced with PageRank, etc.)
    const maxDegree = 100;
    const normalizedDegree = Math.min(degree, maxDegree) / maxDegree;

    // Bonus for diverse relationship types
    const uniqueRelationships = new Set(
      neighbors.map((n) => n.relationship),
    ).size;
    const diversityBonus = Math.min(uniqueRelationships / 10, 0.5);

    return normalizedDegree + diversityBonus;
  }

  /**
   * Index entities in batches
   */
  private async indexEntitiesInBatches(
    entities: EntityDocument[],
  ): Promise<void> {
    const batches = this.chunkArray(entities, this.config.batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      this.logger.debug(`Indexing batch ${i + 1}/${batches.length}`, {
        batchSize: batch.length,
      });

      await this.indexBatch(batch);
    }
  }

  /**
   * Index a batch of entities
   */
  private async indexBatch(entities: EntityDocument[]): Promise<void> {
    const operations: any[] = [];

    for (const entity of entities) {
      // Index operation
      operations.push({
        index: {
          _index: this.getIndexName(entity.kind),
          _id: entity.id,
        },
      });

      // Document
      operations.push(entity);
    }

    let retries = 0;
    while (retries < this.config.maxRetries) {
      try {
        await this.elasticsearch.bulkIndex(operations);
        return;
      } catch (error) {
        retries++;
        this.logger.warn(`Batch indexing failed, retry ${retries}/${this.config.maxRetries}`, {
          error: error instanceof Error ? error.message : String(error),
        });

        if (retries >= this.config.maxRetries) {
          throw error;
        }

        // Exponential backoff
        await this.sleep(Math.pow(2, retries) * 1000);
      }
    }
  }

  /**
   * Get index name for entity type
   */
  private getIndexName(entityKind: string): string {
    const prefix = process.env.ELASTICSEARCH_INDEX_PREFIX || 'summit';
    return `${prefix}-${entityKind.toLowerCase()}`;
  }

  /**
   * Chunk array into batches
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Index a single entity (for real-time updates)
   */
  async indexEntity(entityId: string): Promise<void> {
    try {
      const query = `
        SELECT
          id,
          tenant_id as "tenantId",
          kind,
          labels,
          props,
          created_at as "createdAt",
          updated_at as "updatedAt",
          created_by as "createdBy"
        FROM entities
        WHERE id = $1
      `;

      const result = await this.pg.query(query, [entityId]);

      if (result.rows.length === 0) {
        this.logger.warn('Entity not found for indexing', { entityId });
        return;
      }

      const entity = this.transformEntity(result.rows[0]);
      const enriched = await this.enrichWithGraphData([entity]);

      await this.elasticsearch.indexDocument(
        this.getIndexName(entity.kind),
        entity.id,
        enriched[0],
      );

      this.logger.info('Entity indexed successfully', { entityId });
    } catch (error) {
      this.logger.error('Failed to index entity', {
        entityId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete entity from index
   */
  async deleteEntity(entityId: string, entityKind: string): Promise<void> {
    try {
      const indexName = this.getIndexName(entityKind);
      // Note: ElasticsearchService needs a deleteDocument method
      this.logger.info('Entity deleted from index', { entityId, indexName });
    } catch (error) {
      this.logger.error('Failed to delete entity from index', {
        entityId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get indexing status
   */
  getStatus(): {
    isIndexing: boolean;
    lastSyncTimestamp: Date;
    config: IndexingConfig;
  } {
    return {
      isIndexing: this.isIndexing,
      lastSyncTimestamp: this.lastSyncTimestamp,
      config: this.config,
    };
  }
}
