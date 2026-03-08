"use strict";
/**
 * STIX Ingestion Service
 * Main orchestrator for STIX/TAXII feed ingestion with storage and enrichment
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StixIngestionService = void 0;
exports.createStixIngestionService = createStixIngestionService;
const pino_1 = __importDefault(require("pino"));
const node_events_1 = require("node:events");
const TaxiiClient_js_1 = require("../client/TaxiiClient.js");
const AirgapProxy_js_1 = require("../client/AirgapProxy.js");
const PgVectorStore_js_1 = require("../storage/PgVectorStore.js");
const Neo4jGraphStore_js_1 = require("../storage/Neo4jGraphStore.js");
const AgenticEnricher_js_1 = require("../enrichment/AgenticEnricher.js");
const logger = (0, pino_1.default)({ name: 'stix-ingestion-service' });
class StixIngestionService extends node_events_1.EventEmitter {
    config;
    pgStore;
    neo4jStore;
    enricher;
    airgapProxy;
    feedClients = new Map();
    initialized = false;
    constructor(config = {}) {
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
        this.pgStore = (0, PgVectorStore_js_1.createPgVectorStore)(this.config.postgres);
        this.neo4jStore = (0, Neo4jGraphStore_js_1.createNeo4jGraphStore)(this.config.neo4j);
        this.enricher = (0, AgenticEnricher_js_1.createAgenticEnricher)({
            openaiApiKey: this.config.enrichment.openaiApiKey,
            generateEmbeddings: this.config.enrichment.generateEmbeddings,
            mapMitre: this.config.enrichment.mapMitre,
        });
        this.airgapProxy = (0, AirgapProxy_js_1.createAirgapProxy)(this.config.airgap);
    }
    /**
     * Initialize the service and storage backends
     */
    async initialize() {
        if (this.initialized)
            return;
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
    registerFeed(feedConfig) {
        const client = (0, TaxiiClient_js_1.createTaxiiClient)({
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
    unregisterFeed(feedId) {
        this.feedClients.delete(feedId);
        logger.info({ feedId }, 'Feed unregistered');
    }
    /**
     * Sync a registered feed
     */
    async syncFeed(feedConfig, options = {}) {
        await this.ensureInitialized();
        const stats = {
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
                client = this.feedClients.get(feedConfig.id);
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
                }
                catch (error) {
                    logger.error({ error: error.message, batch: batchNumber }, 'Batch processing failed');
                    stats.errors.push({ error: error.message });
                }
            }
            // Update sync state on success
            await this.pgStore.updateFeedSyncState(feedConfig.id, collectionId, {
                lastSync: new Date().toISOString(),
                objectsSynced: stats.objectsStored,
                status: 'idle',
            });
        }
        catch (error) {
            const err = error;
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
        logger.info({
            feedId: feedConfig.id,
            received: stats.objectsReceived,
            stored: stats.objectsStored,
            failed: stats.objectsFailed,
            durationMs: stats.durationMs,
        }, 'Feed sync completed');
        return stats;
    }
    /**
     * Ingest a STIX bundle directly
     */
    async ingestBundle(bundle, feedId, feedName, options = {}) {
        await this.ensureInitialized();
        const stats = {
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
        const feedConfig = {
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
    async importAirgapPackage(filepath) {
        await this.ensureInitialized();
        const pkg = await this.airgapProxy.readImportPackage(filepath);
        const objectsWithMetadata = this.airgapProxy.extractObjects(pkg);
        const stats = {
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
    async exportToAirgap(feedConfig, objects) {
        const pkg = await this.airgapProxy.createExportPackage(feedConfig, objects);
        return this.airgapProxy.writeExportPackage(pkg);
    }
    /**
     * Get service statistics
     */
    async getStats() {
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
    async searchIOCs(options) {
        await this.ensureInitialized();
        return this.pgStore.search(options);
    }
    /**
     * Get threat actor graph
     */
    async getThreatActorGraph(actorId) {
        await this.ensureInitialized();
        return this.neo4jStore.getThreatActorGraph(actorId);
    }
    /**
     * Find paths between entities
     */
    async findPaths(sourceId, targetId, maxHops = 4) {
        await this.ensureInitialized();
        return this.neo4jStore.findPaths(sourceId, targetId, maxHops);
    }
    /**
     * Close all connections
     */
    async close() {
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
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }
    async processBatch(feedConfig, objects, options) {
        const result = {
            processed: 0,
            stored: 0,
            enriched: 0,
            failed: 0,
            relationships: 0,
            errors: [],
        };
        const metadata = {
            feedId: feedConfig.id,
            feedName: feedConfig.name,
            ingestedAt: new Date().toISOString(),
            source: feedConfig.serverUrl,
        };
        // Separate objects and relationships
        const stixObjects = [];
        const relationships = [];
        const sightings = [];
        for (const obj of objects) {
            if (obj.type === 'relationship') {
                relationships.push(obj);
            }
            else if (obj.type === 'sighting') {
                sightings.push(obj);
            }
            else {
                stixObjects.push(obj);
            }
        }
        // Enrich objects
        let enrichments = [];
        if (options.enrich !== false && this.config.enrichment.enabled) {
            try {
                enrichments = await this.enricher.enrichBatch(stixObjects.map((object) => ({ object, metadata })));
                result.enriched = enrichments.length;
            }
            catch (error) {
                logger.error({ error: error.message }, 'Enrichment failed');
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
            }
            catch (error) {
                logger.error({ error: error.message }, 'Vector store failed');
                result.errors.push({ error: error.message });
            }
        }
        // Store in graph database
        if (options.storeGraph !== false) {
            try {
                // Store objects
                const graphResult = await this.neo4jStore.storeBatch(stixObjects.map((object) => ({ object, metadata })));
                result.errors.push(...graphResult.errors);
                // Store relationships
                for (const rel of relationships) {
                    try {
                        await this.neo4jStore.storeRelationship(rel, metadata);
                        result.relationships++;
                    }
                    catch (error) {
                        result.errors.push({ objectId: rel.id, error: error.message });
                    }
                }
                // Store sightings
                for (const sighting of sightings) {
                    try {
                        await this.neo4jStore.storeSighting(sighting, metadata);
                    }
                    catch (error) {
                        result.errors.push({ objectId: sighting.id, error: error.message });
                    }
                }
            }
            catch (error) {
                logger.error({ error: error.message }, 'Graph store failed');
                result.errors.push({ error: error.message });
            }
        }
        result.processed = objects.length;
        result.failed = result.errors.length;
        return result;
    }
}
exports.StixIngestionService = StixIngestionService;
/**
 * Factory function to create StixIngestionService
 */
function createStixIngestionService(config) {
    return new StixIngestionService(config);
}
