/**
 * Time-Series Metrics Storage Platform
 *
 * Main entry point for the CompanyOS observability metrics service.
 */

import express from 'express';
import { Pool } from 'pg';
import { Kafka } from 'kafkajs';
import winston from 'winston';
import { CronJob } from 'cron';

import { loadConfig, Config } from './config/index.js';
import { StorageTierManager } from './storage/tier-manager.js';
import { QueryEngine } from './query/query-engine.js';
import { IngestionPipeline } from './ingestion/ingestion-pipeline.js';
import { SLOCalculator } from './slo/slo-calculator.js';
import { createRouter } from './api/routes.js';
import { createTenantConfig, TenantTier } from './models/tenant.js';

// ============================================================================
// LOGGER SETUP
// ============================================================================

function createLogger(config: Config): winston.Logger {
  const format =
    config.logging.format === 'pretty'
      ? winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
          }),
        )
      : winston.format.combine(winston.format.timestamp(), winston.format.json());

  return winston.createLogger({
    level: config.logging.level,
    format,
    transports: [new winston.transports.Console()],
  });
}

// ============================================================================
// DATABASE SETUP
// ============================================================================

function createPool(config: Config): Pool {
  return new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    max: config.database.maxConnections,
    idleTimeoutMillis: config.database.idleTimeoutMs,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  });
}

// ============================================================================
// KAFKA SETUP
// ============================================================================

function createKafka(config: Config): Kafka | undefined {
  if (!config.kafka.enabled) {
    return undefined;
  }

  return new Kafka({
    clientId: config.kafka.clientId,
    brokers: config.kafka.brokers,
  });
}

// ============================================================================
// SCHEDULED JOBS
// ============================================================================

function setupScheduledJobs(
  storageManager: StorageTierManager,
  logger: winston.Logger,
  config: Config,
): CronJob[] {
  const jobs: CronJob[] = [];

  // Downsampling job - runs every hour
  if (config.storage.downsamplingEnabled) {
    const downsamplingJob = new CronJob('0 * * * *', async () => {
      logger.info('Starting scheduled downsampling job');
      try {
        const result = await storageManager.runDownsampling();
        logger.info('Downsampling job completed', { result });
      } catch (error) {
        logger.error('Downsampling job failed', { error });
      }
    });
    downsamplingJob.start();
    jobs.push(downsamplingJob);
  }

  // Retention cleanup job - runs daily at 3am
  const cleanupJob = new CronJob('0 3 * * *', async () => {
    logger.info('Starting scheduled retention cleanup job');
    try {
      const result = await storageManager.runRetentionCleanup();
      logger.info('Retention cleanup job completed', { result });
    } catch (error) {
      logger.error('Retention cleanup job failed', { error });
    }
  });
  cleanupJob.start();
  jobs.push(cleanupJob);

  return jobs;
}

// ============================================================================
// MAIN APPLICATION
// ============================================================================

export class TimeSeriesMetricsService {
  private config: Config;
  private logger: winston.Logger;
  private pool: Pool;
  private kafka?: Kafka;
  private storageManager: StorageTierManager;
  private queryEngine: QueryEngine;
  private ingestionPipeline: IngestionPipeline;
  private sloCalculator: SLOCalculator;
  private app: express.Application;
  private server?: ReturnType<express.Application['listen']>;
  private scheduledJobs: CronJob[] = [];

  constructor(config?: Config) {
    this.config = config || loadConfig();
    this.logger = createLogger(this.config);
    this.pool = createPool(this.config);
    this.kafka = createKafka(this.config);

    // Initialize components
    this.storageManager = new StorageTierManager(this.pool, this.logger);
    this.queryEngine = new QueryEngine(this.storageManager, this.logger);
    this.ingestionPipeline = new IngestionPipeline(
      this.storageManager,
      this.logger,
      {
        batchSize: this.config.ingestion.batchSize,
        batchTimeoutMs: this.config.ingestion.batchTimeoutMs,
        enableKafka: this.config.kafka.enabled,
        kafkaTopic: this.config.kafka.topic,
        maxClockSkewMs: this.config.ingestion.maxClockSkewMs,
        futureTolerance: this.config.ingestion.futureTolerance,
        pastTolerance: this.config.ingestion.pastTolerance,
      },
    );
    this.sloCalculator = new SLOCalculator(this.queryEngine, this.logger);

    // Setup Express app
    this.app = express();
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(
      express.urlencoded({ extended: true, limit: '10mb' }),
    );

    // Setup routes
    const router = createRouter({
      ingestionPipeline: this.ingestionPipeline,
      queryEngine: this.queryEngine,
      sloCalculator: this.sloCalculator,
      storageManager: this.storageManager,
      logger: this.logger,
    });
    this.app.use(router);
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Time-Series Metrics Service...');

    // Initialize storage
    await this.storageManager.initialize();
    this.logger.info('Storage initialized');

    // Initialize ingestion pipeline
    await this.ingestionPipeline.initialize(this.kafka);
    this.logger.info('Ingestion pipeline initialized');

    // Register default tenant
    const defaultTenant = createTenantConfig(
      'default',
      'Default Tenant',
      TenantTier.PROFESSIONAL,
    );
    this.ingestionPipeline.registerTenant(defaultTenant);

    // Setup scheduled jobs
    this.scheduledJobs = setupScheduledJobs(
      this.storageManager,
      this.logger,
      this.config,
    );
    this.logger.info('Scheduled jobs initialized', {
      jobCount: this.scheduledJobs.length,
    });

    this.logger.info('Time-Series Metrics Service initialized');
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    const { port, host } = this.config.server;

    this.server = this.app.listen(port, host, () => {
      this.logger.info(`Time-Series Metrics Service started`, {
        host,
        port,
        endpoints: {
          health: `http://${host}:${port}/health`,
          write: `http://${host}:${port}/api/v1/write`,
          query: `http://${host}:${port}/api/v1/query`,
          queryRange: `http://${host}:${port}/api/v1/query_range`,
          slos: `http://${host}:${port}/api/v1/slos`,
          metrics: `http://${host}:${port}/metrics`,
        },
      });
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Time-Series Metrics Service...');

    // Stop scheduled jobs
    for (const job of this.scheduledJobs) {
      job.stop();
    }

    // Stop HTTP server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
    }

    // Shutdown ingestion pipeline
    await this.ingestionPipeline.shutdown();

    // Close database pool
    await this.pool.end();

    this.logger.info('Time-Series Metrics Service shutdown complete');
    process.exit(0);
  }

  /**
   * Get the Express app (for testing)
   */
  getApp(): express.Application {
    return this.app;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { StorageTierManager } from './storage/tier-manager.js';
export { QueryEngine } from './query/query-engine.js';
export { IngestionPipeline } from './ingestion/ingestion-pipeline.js';
export { SLOCalculator } from './slo/slo-calculator.js';
export * from './models/metric-types.js';
export * from './models/retention-policy.js';
export * from './models/tenant.js';
export { loadConfig } from './config/index.js';

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  const service = new TimeSeriesMetricsService();

  try {
    await service.initialize();
    await service.start();
  } catch (error) {
    console.error('Failed to start service:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
