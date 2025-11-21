import { Pool } from 'pg';
import { Driver as Neo4jDriver } from 'neo4j-driver';
import { createClient, RedisClientType } from 'redis';
import { createLogger, format, transports, Logger } from 'winston';

import { ElasticsearchService } from './ElasticsearchService';
import { IndexingService } from './IndexingService';
import { SearchAnalyticsService } from './SearchAnalyticsService';
import { ALL_INDEX_MAPPINGS } from '../config/indexMappings';

export class SearchInitService {
  private logger: Logger;
  private elasticsearch: ElasticsearchService;
  private indexingService?: IndexingService;
  private analyticsService?: SearchAnalyticsService;

  constructor(
    private pg: Pool,
    private neo4j: Neo4jDriver,
    private redis: RedisClientType,
  ) {
    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
      ),
      transports: [
        new transports.Console({
          format: format.combine(format.colorize(), format.simple()),
        }),
        new transports.File({ filename: 'logs/search-init.log' }),
      ],
    });

    this.elasticsearch = new ElasticsearchService();
  }

  /**
   * Initialize the entire search system
   */
  async initialize(): Promise<void> {
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
    } catch (error) {
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
  private async checkElasticsearchHealth(): Promise<void> {
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
  private async createDatabaseTables(): Promise<void> {
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
    } catch (error) {
      this.logger.error('Failed to create database tables', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create Elasticsearch indices
   */
  private async createIndices(): Promise<void> {
    this.logger.info('Creating Elasticsearch indices...');

    for (const indexMapping of ALL_INDEX_MAPPINGS) {
      try {
        this.logger.info(`Creating index: ${indexMapping.name}`);
        await this.elasticsearch.createIndex(indexMapping);
        this.logger.info(`✅ Index created: ${indexMapping.name}`);
      } catch (error: any) {
        if (error?.meta?.body?.error?.type === 'resource_already_exists_exception') {
          this.logger.warn(`Index already exists: ${indexMapping.name}`);
        } else {
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
  private async initializeServices(): Promise<void> {
    this.logger.info('Initializing search services...');

    // Initialize indexing service
    this.indexingService = new IndexingService(
      this.pg,
      this.neo4j,
      this.elasticsearch,
      {
        batchSize: parseInt(process.env.SEARCH_BATCH_SIZE || '1000'),
        indexingInterval: parseInt(
          process.env.SEARCH_INDEXING_INTERVAL || '60000',
        ),
        enableRealTimeSync:
          process.env.SEARCH_ENABLE_REALTIME !== 'false',
        maxRetries: 3,
      },
    );

    // Initialize analytics service
    this.analyticsService = new SearchAnalyticsService(
      this.pg,
      this.redis as any,
    );

    this.logger.info('Search services initialized');
  }

  /**
   * Perform initial indexing
   */
  private async performInitialIndexing(): Promise<void> {
    if (!this.indexingService) {
      throw new Error('Indexing service not initialized');
    }

    const shouldSkipInitialIndexing =
      process.env.SEARCH_SKIP_INITIAL_INDEXING === 'true';

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
    } catch (error) {
      this.logger.error('Initial indexing failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - allow system to start even if initial indexing fails
    }
  }

  /**
   * Get service instances (for use in application)
   */
  getServices(): {
    elasticsearch: ElasticsearchService;
    indexing: IndexingService;
    analytics: SearchAnalyticsService;
  } {
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
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const details: Record<string, any> = {};

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
      const status =
        esHealth.status === 'red'
          ? 'unhealthy'
          : esHealth.status === 'yellow'
            ? 'degraded'
            : 'healthy';

      return { status, details };
    } catch (error) {
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
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down search system...');

    try {
      // Close database connections
      await this.pg.end();
      await this.neo4j.close();
      await this.redis.quit();

      this.logger.info('Search system shut down successfully');
    } catch (error) {
      this.logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
