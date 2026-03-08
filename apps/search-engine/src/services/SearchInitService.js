"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchInitService = void 0;
const winston_1 = require("winston");
const indexMappings_1 = require("../config/indexMappings");
const ElasticsearchService_1 = require("./ElasticsearchService");
const IndexingService_1 = require("./IndexingService");
const SearchAnalyticsService_1 = require("./SearchAnalyticsService");
class SearchInitService {
    pg;
    neo4j;
    redis;
    logger;
    elasticsearch;
    indexingService;
    analyticsService;
    constructor(pg, neo4j, redis) {
        this.pg = pg;
        this.neo4j = neo4j;
        this.redis = redis;
        this.logger = (0, winston_1.createLogger)({
            level: process.env.LOG_LEVEL || 'info',
            format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.errors({ stack: true }), winston_1.format.json()),
            transports: [
                new winston_1.transports.Console({
                    format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.simple()),
                }),
                new winston_1.transports.File({ filename: 'logs/search-init.log' }),
            ],
        });
        this.elasticsearch = new ElasticsearchService_1.ElasticsearchService();
    }
    /**
     * Initialize the entire search system
     */
    async initialize() {
        this.logger.info('🔍 Initializing search system...');
        try {
            // Step 1: Check Elasticsearch health
            await this.checkElasticsearchHealth();
            // Step 2: Create database tables for analytics
            await this.createDatabaseTables();
            // Step 3: Create Elasticsearch indices
            await this.createIndices();
            // Step 4: Initialize services
            await this.initializeServices();
            // Step 5: Perform initial indexing
            await this.performInitialIndexing();
            this.logger.info('✅ Search system initialized successfully');
        }
        catch (error) {
            this.logger.error('❌ Failed to initialize search system', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
        }
    }
    /**
     * Check Elasticsearch health
     */
    async checkElasticsearchHealth() {
        this.logger.info('Checking Elasticsearch health...');
        const health = await this.elasticsearch.healthCheck();
        if (health.status === 'red') {
            throw new Error('Elasticsearch cluster is unhealthy');
        }
        this.logger.info('Elasticsearch health check passed', {
            status: health.status,
            version: health.details.version,
        });
    }
    /**
     * Create database tables for search analytics
     */
    async createDatabaseTables() {
        this.logger.info('Creating database tables for search analytics...');
        try {
            // Search analytics table
            await this.pg.query(`
        CREATE TABLE IF NOT EXISTS search_analytics (
          query_id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          query_text TEXT NOT NULL,
          query_type VARCHAR(50) NOT NULL,
          filters JSONB,
          result_count INTEGER NOT NULL,
          execution_time INTEGER NOT NULL,
          success BOOLEAN NOT NULL DEFAULT true,
          session_id VARCHAR(255),
          timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
            // Create indexes for analytics
            await this.pg.query(`
        CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id
        ON search_analytics(user_id);
      `);
            await this.pg.query(`
        CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp
        ON search_analytics(timestamp);
      `);
            await this.pg.query(`
        CREATE INDEX IF NOT EXISTS idx_search_analytics_query_text
        ON search_analytics(query_text);
      `);
            // Search clicks table
            await this.pg.query(`
        CREATE TABLE IF NOT EXISTS search_clicks (
          id SERIAL PRIMARY KEY,
          query_id VARCHAR(255) NOT NULL,
          result_id VARCHAR(255) NOT NULL,
          position INTEGER NOT NULL,
          timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
          FOREIGN KEY (query_id) REFERENCES search_analytics(query_id) ON DELETE CASCADE
        );
      `);
            await this.pg.query(`
        CREATE INDEX IF NOT EXISTS idx_search_clicks_query_id
        ON search_clicks(query_id);
      `);
            // Search refinements table
            await this.pg.query(`
        CREATE TABLE IF NOT EXISTS search_refinements (
          id SERIAL PRIMARY KEY,
          query_id VARCHAR(255) NOT NULL,
          original_query TEXT NOT NULL,
          refined_query TEXT NOT NULL,
          refinement_type VARCHAR(50) NOT NULL,
          timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
          FOREIGN KEY (query_id) REFERENCES search_analytics(query_id) ON DELETE CASCADE
        );
      `);
            await this.pg.query(`
        CREATE INDEX IF NOT EXISTS idx_search_refinements_query_id
        ON search_refinements(query_id);
      `);
            this.logger.info('Database tables created successfully');
        }
        catch (error) {
            this.logger.error('Failed to create database tables', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Create Elasticsearch indices
     */
    async createIndices() {
        this.logger.info('Creating Elasticsearch indices...');
        for (const indexMapping of indexMappings_1.ALL_INDEX_MAPPINGS) {
            try {
                this.logger.info(`Creating index: ${indexMapping.name}`);
                await this.elasticsearch.createIndex(indexMapping);
                this.logger.info(`✅ Index created: ${indexMapping.name}`);
            }
            catch (error) {
                if (error?.meta?.body?.error?.type === 'resource_already_exists_exception') {
                    this.logger.warn(`Index already exists: ${indexMapping.name}`);
                }
                else {
                    this.logger.error(`Failed to create index: ${indexMapping.name}`, {
                        error: error instanceof Error ? error.message : String(error),
                    });
                    throw error;
                }
            }
        }
        this.logger.info('All indices created successfully');
    }
    /**
     * Initialize search services
     */
    async initializeServices() {
        this.logger.info('Initializing search services...');
        // Initialize indexing service
        this.indexingService = new IndexingService_1.IndexingService(this.pg, this.neo4j, this.elasticsearch, {
            batchSize: parseInt(process.env.SEARCH_BATCH_SIZE || '1000'),
            indexingInterval: parseInt(process.env.SEARCH_INDEXING_INTERVAL || '60000'),
            enableRealTimeSync: process.env.SEARCH_ENABLE_REALTIME !== 'false',
            maxRetries: 3,
        });
        // Initialize analytics service
        this.analyticsService = new SearchAnalyticsService_1.SearchAnalyticsService(this.pg, this.redis);
        this.logger.info('Search services initialized');
    }
    /**
     * Perform initial indexing
     */
    async performInitialIndexing() {
        if (!this.indexingService) {
            throw new Error('Indexing service not initialized');
        }
        const shouldSkipInitialIndexing = process.env.SEARCH_SKIP_INITIAL_INDEXING === 'true';
        if (shouldSkipInitialIndexing) {
            this.logger.info('Skipping initial indexing (SEARCH_SKIP_INITIAL_INDEXING=true)');
            return;
        }
        this.logger.info('Starting initial indexing...');
        try {
            await this.indexingService.performFullSync();
            this.logger.info('✅ Initial indexing completed');
            // Start continuous indexing
            await this.indexingService.startIndexing();
            this.logger.info('Continuous indexing started');
        }
        catch (error) {
            this.logger.error('Initial indexing failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            // Don't throw - allow system to start even if initial indexing fails
        }
    }
    /**
     * Get service instances (for use in application)
     */
    getServices() {
        if (!this.indexingService || !this.analyticsService) {
            throw new Error('Services not initialized. Call initialize() first.');
        }
        return {
            elasticsearch: this.elasticsearch,
            indexing: this.indexingService,
            analytics: this.analyticsService,
        };
    }
    /**
     * Health check for search system
     */
    async healthCheck() {
        const details = {};
        try {
            // Check Elasticsearch
            const esHealth = await this.elasticsearch.healthCheck();
            details.elasticsearch = {
                status: esHealth.status,
                cluster: esHealth.details.cluster.cluster_name,
            };
            // Check indexing service
            if (this.indexingService) {
                const indexingStatus = this.indexingService.getStatus();
                details.indexing = {
                    isIndexing: indexingStatus.isIndexing,
                    lastSync: indexingStatus.lastSyncTimestamp,
                };
            }
            // Check database connectivity
            await this.pg.query('SELECT 1');
            details.database = { status: 'connected' };
            // Check Redis connectivity
            await this.redis.ping();
            details.redis = { status: 'connected' };
            // Determine overall status
            const status = esHealth.status === 'red'
                ? 'unhealthy'
                : esHealth.status === 'yellow'
                    ? 'degraded'
                    : 'healthy';
            return { status, details };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                details: {
                    error: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }
    /**
     * Graceful shutdown
     */
    async shutdown() {
        this.logger.info('Shutting down search system...');
        try {
            // Close database connections
            await this.pg.end();
            await this.neo4j.close();
            await this.redis.quit();
            this.logger.info('Search system shut down successfully');
        }
        catch (error) {
            this.logger.error('Error during shutdown', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}
exports.SearchInitService = SearchInitService;
