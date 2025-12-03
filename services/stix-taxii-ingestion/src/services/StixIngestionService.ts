/**
 * STIX Ingestion Service
 * Main orchestrator for STIX/TAXII feed ingestion with storage and enrichment
 */

import pino from 'pino';
import { EventEmitter } from 'node:events';
import type {
  StixObject,
  StixBundle,
  IngestionMetadata,
  Relationship,
  Sighting,
} from '../types/stix-2.1.js';
import type { TaxiiFeedConfig, TaxiiSyncResult } from '../types/taxii-2.1.js';
import { TaxiiClient, createTaxiiClient } from '../client/TaxiiClient.js';
import { AirgapProxy, createAirgapProxy, AirgapImportResult } from '../client/AirgapProxy.js';
import { PgVectorStore, createPgVectorStore } from '../storage/PgVectorStore.js';
import { Neo4jGraphStore, createNeo4jGraphStore } from '../storage/Neo4jGraphStore.js';
import { AgenticEnricher, createAgenticEnricher, EnrichmentResult } from '../enrichment/AgenticEnricher.js';

const logger = pino({ name: 'stix-ingestion-service' });

export interface IngestionServiceConfig {
  /** PostgreSQL configuration */
  postgres?: {
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
  };
  /** Neo4j configuration */
  neo4j?: {
    uri?: string;
    username?: string;
    password?: string;
    database?: string;
  };
  /** Enrichment configuration */
  enrichment?: {
    enabled?: boolean;
    openaiApiKey?: string;
    generateEmbeddings?: boolean;
    mapMitre?: boolean;
  };
  /** Air-gap proxy configuration */
  airgap?: {
    enabled?: boolean;
    exportDir?: string;
    importDir?: string;
    processedDir?: string;
  };
  /** Batch processing configuration */
  batchSize?: number;
  /** Maximum concurrent operations */
  concurrency?: number;
}

export interface IngestionStats {
  feedId: string;
  startTime: string;
  endTime?: string;
  objectsReceived: number;
  objectsProcessed: number;
  objectsStored: number;
  objectsEnriched: number;
  objectsFailed: number;
  relationshipsCreated: number;
  durationMs?: number;
  errors: Array<{ objectId?: string; error: string }>;
}

export interface FeedSyncOptions {
  /** Only sync objects added after this timestamp */
  addedAfter?: string;
  /** Object types to include */
  types?: string[];
  /** Maximum objects to fetch */
  limit?: number;
  /** Whether to enrich objects */
  enrich?: boolean;
  /** Whether to store in graph database */
  storeGraph?: boolean;
  /** Whether to store in vector database */
  storeVector?: boolean;
}

type IngestionServiceEvents = {
  'sync:start': [feedId: string];
  'sync:progress': [feedId: string, progress: { current: number; total: number }];
  'sync:complete': [feedId: string, stats: IngestionStats];
  'sync:error': [feedId: string, error: Error];
  'object:processed': [object: StixObject, enrichment?: EnrichmentResult];
  'batch:complete': [feedId: string, batchNumber: number, count: number];
};

export class StixIngestionService extends EventEmitter {
  private readonly config: Required<IngestionServiceConfig>;
  private readonly pgStore: PgVectorStore;
  private readonly neo4jStore: Neo4jGraphStore;
  private readonly enricher: AgenticEnricher;
  private readonly airgapProxy: AirgapProxy;
  private readonly feedClients: Map<string, TaxiiClient> = new Map();
  private initialized = false;

  constructor(config: IngestionServiceConfig = {}) {
    super();

    this.config = {
      postgres: config.postgres || {},
      neo4j: config.neo4j || {},
      enrichment: {
        enabled: config.enrichment?.enabled ?? true,
        openaiApiKey: config.enrichment?.openaiApiKey || process.env.OPENAI_API_KEY || '',
        generateEmbeddings: config.enrichment?.generateEmbeddings ?? true,
        mapMitre: config.enrichment?.mapMitre ?? true,
      },
      airgap: {
        enabled: config.airgap?.enabled ?? false,
        exportDir: config.airgap?.exportDir || '/var/lib/stix-taxii/export',
        importDir: config.airgap?.importDir || '/var/lib/stix-taxii/import',
        processedDir: config.airgap?.processedDir || '/var/lib/stix-taxii/processed',
      },
      batchSize: config.batchSize || 100,
      concurrency: config.concurrency || 4,
    };

    this.pgStore = createPgVectorStore(this.config.postgres);
    this.neo4jStore = createNeo4jGraphStore(this.config.neo4j);
    this.enricher = createAgenticEnricher({
      openaiApiKey: this.config.enrichment.openaiApiKey,
      generateEmbeddings: this.config.enrichment.generateEmbeddings,
      mapMitre: this.config.enrichment.mapMitre,
    });
    this.airgapProxy = createAirgapProxy(this.config.airgap);
  }

  /**
   * Initialize the service and storage backends
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info('Initializing STIX Ingestion Service...');

    await Promise.all([
      this.pgStore.initialize(),
      this.neo4jStore.initialize(),
    ]);

    this.initialized = true;
    logger.info('STIX Ingestion Service initialized');
  }

  /**
   * Register a TAXII feed for ingestion
   */
  registerFeed(feedConfig: TaxiiFeedConfig): void {
    const client = createTaxiiClient({
      serverUrl: feedConfig.serverUrl,
      apiRoot: feedConfig.apiRoot,
      auth: feedConfig.auth,
      proxy: feedConfig.proxy,
    });

    this.feedClients.set(feedConfig.id, client);
    logger.info({ feedId: feedConfig.id, serverUrl: feedConfig.serverUrl }, 'Feed registered');
  }

  /**
   * Unregister a feed
   */
  unregisterFeed(feedId: string): void {
    this.feedClients.delete(feedId);
    logger.info({ feedId }, 'Feed unregistered');
  }

  /**
   * Sync a registered feed
   */
  async syncFeed(
    feedConfig: TaxiiFeedConfig,
    options: FeedSyncOptions = {}
  ): Promise<IngestionStats> {
    await this.ensureInitialized();

    const stats: IngestionStats = {
      feedId: feedConfig.id,
      startTime: new Date().toISOString(),
      objectsReceived: 0,
      objectsProcessed: 0,
      objectsStored: 0,
      objectsEnriched: 0,
      objectsFailed: 0,
      relationshipsCreated: 0,
      errors: [],
    };

    this.emit('sync:start', feedConfig.id);

    try {
      // Get or create client
      let client = this.feedClients.get(feedConfig.id);
      if (!client) {
        this.registerFeed(feedConfig);
        client = this.feedClients.get(feedConfig.id)!;
      }

      // Determine collection to sync
      const collectionId = feedConfig.collectionId;
      if (!collectionId) {
        throw new Error('No collection ID specified for feed');
      }

      // Get sync state
      const syncState = await this.pgStore.getFeedSyncState(feedConfig.id);
      const addedAfter = options.addedAfter || syncState.lastSync || undefined;

      // Update sync status
      await this.pgStore.updateFeedSyncState(feedConfig.id, collectionId, {
        status: 'syncing',
      });

      // Fetch objects from TAXII server
      logger.info({ feedId: feedConfig.id, addedAfter }, 'Fetching objects from TAXII server');

      const objects = await client.getAllObjects(collectionId, {
        added_after: addedAfter,
        match: options.types ? { type: options.types } : undefined,
      });

      stats.objectsReceived = objects.length;
      logger.info({ feedId: feedConfig.id, count: objects.length }, 'Objects received');

      // Process in batches
      const batchSize = this.config.batchSize;
      let batchNumber = 0;

      for (let i = 0; i < objects.length; i += batchSize) {
        const batch = objects.slice(i, i + batchSize);
        batchNumber++;

        try {
          const batchStats = await this.processBatch(feedConfig, batch, options);

          stats.objectsProcessed += batchStats.processed;
          stats.objectsStored += batchStats.stored;
          stats.objectsEnriched += batchStats.enriched;
          stats.objectsFailed += batchStats.failed;
          stats.relationshipsCreated += batchStats.relationships;
          stats.errors.push(...batchStats.errors);

          this.emit('sync:progress', feedConfig.id, {
            current: Math.min(i + batchSize, objects.length),
            total: objects.length,
          });

          this.emit('batch:complete', feedConfig.id, batchNumber, batch.length);
        } catch (error) {
          logger.error({ error: (error as Error).message, batch: batchNumber }, 'Batch processing failed');
          stats.errors.push({ error: (error as Error).message });
        }
      }

      // Update sync state on success
      await this.pgStore.updateFeedSyncState(feedConfig.id, collectionId, {
        lastSync: new Date().toISOString(),
        objectsSynced: stats.objectsStored,
        status: 'idle',
      });

    } catch (error) {
      const err = error as Error;
      logger.error({ error: err.message, feedId: feedConfig.id }, 'Feed sync failed');
      stats.errors.push({ error: err.message });

      await this.pgStore.updateFeedSyncState(feedConfig.id, feedConfig.collectionId || '', {
        status: 'error',
        error: err.message,
      });

      this.emit('sync:error', feedConfig.id, err);
    }

    stats.endTime = new Date().toISOString();
    stats.durationMs = new Date(stats.endTime).getTime() - new Date(stats.startTime).getTime();

    this.emit('sync:complete', feedConfig.id, stats);

    logger.info(
      {
        feedId: feedConfig.id,
        received: stats.objectsReceived,
        stored: stats.objectsStored,
        failed: stats.objectsFailed,
        durationMs: stats.durationMs,
      },
      'Feed sync completed'
    );

    return stats;
  }

  /**
   * Ingest a STIX bundle directly
   */
  async ingestBundle(
    bundle: StixBundle,
    feedId: string,
    feedName: string,
    options: FeedSyncOptions = {}
  ): Promise<IngestionStats> {
    await this.ensureInitialized();

    const stats: IngestionStats = {
      feedId,
      startTime: new Date().toISOString(),
      objectsReceived: bundle.objects.length,
      objectsProcessed: 0,
      objectsStored: 0,
      objectsEnriched: 0,
      objectsFailed: 0,
      relationshipsCreated: 0,
      errors: [],
    };

    const feedConfig: TaxiiFeedConfig = {
      id: feedId,
      name: feedName,
      enabled: true,
      serverUrl: 'direct-ingest',
      syncIntervalSeconds: 0,
    };

    const batchStats = await this.processBatch(feedConfig, bundle.objects, options);

    stats.objectsProcessed = batchStats.processed;
    stats.objectsStored = batchStats.stored;
    stats.objectsEnriched = batchStats.enriched;
    stats.objectsFailed = batchStats.failed;
    stats.relationshipsCreated = batchStats.relationships;
    stats.errors = batchStats.errors;
    stats.endTime = new Date().toISOString();
    stats.durationMs = new Date(stats.endTime).getTime() - new Date(stats.startTime).getTime();

    return stats;
  }

  /**
   * Import from air-gapped package
   */
  async importAirgapPackage(filepath: string): Promise<AirgapImportResult & { ingestionStats: IngestionStats }> {
    await this.ensureInitialized();

    const pkg = await this.airgapProxy.readImportPackage(filepath);
    const objectsWithMetadata = this.airgapProxy.extractObjects(pkg);

    const stats: IngestionStats = {
      feedId: pkg.feedConfig.id,
      startTime: new Date().toISOString(),
      objectsReceived: objectsWithMetadata.length,
      objectsProcessed: 0,
      objectsStored: 0,
      objectsEnriched: 0,
      objectsFailed: 0,
      relationshipsCreated: 0,
      errors: [],
    };

    // Process objects
    for (let i = 0; i < objectsWithMetadata.length; i += this.config.batchSize) {
      const batch = objectsWithMetadata.slice(i, i + this.config.batchSize);
      const objects = batch.map((b) => b.object);

      const batchStats = await this.processBatch(pkg.feedConfig, objects, {
        enrich: true,
        storeGraph: true,
        storeVector: true,
      });

      stats.objectsProcessed += batchStats.processed;
      stats.objectsStored += batchStats.stored;
      stats.objectsEnriched += batchStats.enriched;
      stats.objectsFailed += batchStats.failed;
      stats.relationshipsCreated += batchStats.relationships;
      stats.errors.push(...batchStats.errors);
    }

    stats.endTime = new Date().toISOString();
    stats.durationMs = new Date(stats.endTime).getTime() - new Date(stats.startTime).getTime();

    const importResult = await this.airgapProxy.importPackage(filepath);

    return {
      ...importResult,
      ingestionStats: stats,
    };
  }

  /**
   * Export objects to air-gapped package
   */
  async exportToAirgap(
    feedConfig: TaxiiFeedConfig,
    objects: StixObject[]
  ): Promise<string> {
    const pkg = await this.airgapProxy.createExportPackage(feedConfig, objects);
    return this.airgapProxy.writeExportPackage(pkg);
  }

  /**
   * Get service statistics
   */
  async getStats(): Promise<{
    postgres: Awaited<ReturnType<PgVectorStore['getStats']>>;
    neo4j: Awaited<ReturnType<Neo4jGraphStore['getStats']>>;
    registeredFeeds: number;
  }> {
    await this.ensureInitialized();

    const [pgStats, neo4jStats] = await Promise.all([
      this.pgStore.getStats(),
      this.neo4jStore.getStats(),
    ]);

    return {
      postgres: pgStats,
      neo4j: neo4jStats,
      registeredFeeds: this.feedClients.size,
    };
  }

  /**
   * Search IOCs with semantic similarity
   */
  async searchIOCs(options: Parameters<PgVectorStore['search']>[0]) {
    await this.ensureInitialized();
    return this.pgStore.search(options);
  }

  /**
   * Get threat actor graph
   */
  async getThreatActorGraph(actorId: string) {
    await this.ensureInitialized();
    return this.neo4jStore.getThreatActorGraph(actorId as `threat-actor--${string}`);
  }

  /**
   * Find paths between entities
   */
  async findPaths(sourceId: string, targetId: string, maxHops = 4) {
    await this.ensureInitialized();
    return this.neo4jStore.findPaths(sourceId as any, targetId as any, maxHops);
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await Promise.all([
      this.pgStore.close(),
      this.neo4jStore.close(),
    ]);
    this.feedClients.clear();
    logger.info('STIX Ingestion Service closed');
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async processBatch(
    feedConfig: TaxiiFeedConfig,
    objects: StixObject[],
    options: FeedSyncOptions
  ): Promise<{
    processed: number;
    stored: number;
    enriched: number;
    failed: number;
    relationships: number;
    errors: Array<{ objectId?: string; error: string }>;
  }> {
    const result = {
      processed: 0,
      stored: 0,
      enriched: 0,
      failed: 0,
      relationships: 0,
      errors: [] as Array<{ objectId?: string; error: string }>,
    };

    const metadata: IngestionMetadata = {
      feedId: feedConfig.id,
      feedName: feedConfig.name,
      ingestedAt: new Date().toISOString(),
      source: feedConfig.serverUrl,
    };

    // Separate objects and relationships
    const stixObjects: StixObject[] = [];
    const relationships: Relationship[] = [];
    const sightings: Sighting[] = [];

    for (const obj of objects) {
      if (obj.type === 'relationship') {
        relationships.push(obj as Relationship);
      } else if (obj.type === 'sighting') {
        sightings.push(obj as Sighting);
      } else {
        stixObjects.push(obj);
      }
    }

    // Enrich objects
    let enrichments: EnrichmentResult[] = [];
    if (options.enrich !== false && this.config.enrichment.enabled) {
      try {
        enrichments = await this.enricher.enrichBatch(
          stixObjects.map((object) => ({ object, metadata }))
        );
        result.enriched = enrichments.length;
      } catch (error) {
        logger.error({ error: (error as Error).message }, 'Enrichment failed');
      }
    }

    // Store in vector database
    if (options.storeVector !== false) {
      try {
        const storeData = enrichments.length > 0
          ? enrichments.map((e) => ({
              object: e.object,
              metadata,
              embedding: e.embedding,
            }))
          : stixObjects.map((object) => ({ object, metadata }));

        const storeResult = await this.pgStore.storeBatch(storeData);
        result.stored += storeResult.stored;
        result.errors.push(...storeResult.errors);
      } catch (error) {
        logger.error({ error: (error as Error).message }, 'Vector store failed');
        result.errors.push({ error: (error as Error).message });
      }
    }

    // Store in graph database
    if (options.storeGraph !== false) {
      try {
        // Store objects
        const graphResult = await this.neo4jStore.storeBatch(
          stixObjects.map((object) => ({ object, metadata }))
        );
        result.errors.push(...graphResult.errors);

        // Store relationships
        for (const rel of relationships) {
          try {
            await this.neo4jStore.storeRelationship(rel, metadata);
            result.relationships++;
          } catch (error) {
            result.errors.push({ objectId: rel.id, error: (error as Error).message });
          }
        }

        // Store sightings
        for (const sighting of sightings) {
          try {
            await this.neo4jStore.storeSighting(sighting, metadata);
          } catch (error) {
            result.errors.push({ objectId: sighting.id, error: (error as Error).message });
          }
        }
      } catch (error) {
        logger.error({ error: (error as Error).message }, 'Graph store failed');
        result.errors.push({ error: (error as Error).message });
      }
    }

    result.processed = objects.length;
    result.failed = result.errors.length;

    return result;
  }
}

/**
 * Factory function to create StixIngestionService
 */
export function createStixIngestionService(
  config?: IngestionServiceConfig
): StixIngestionService {
  return new StixIngestionService(config);
}
