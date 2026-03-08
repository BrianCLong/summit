"use strict";
/**
 * Time-Series Metrics Storage Platform
 *
 * Main entry point for the CompanyOS observability metrics service.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = exports.SLOCalculator = exports.IngestionPipeline = exports.QueryEngine = exports.StorageTierManager = exports.TimeSeriesMetricsService = void 0;
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
const kafkajs_1 = require("kafkajs");
const winston_1 = __importDefault(require("winston"));
const cron_1 = require("cron");
const index_js_1 = require("./config/index.js");
const tier_manager_js_1 = require("./storage/tier-manager.js");
const query_engine_js_1 = require("./query/query-engine.js");
const ingestion_pipeline_js_1 = require("./ingestion/ingestion-pipeline.js");
const slo_calculator_js_1 = require("./slo/slo-calculator.js");
const routes_js_1 = require("./api/routes.js");
const tenant_js_1 = require("./models/tenant.js");
// ============================================================================
// LOGGER SETUP
// ============================================================================
function createLogger(config) {
    const format = config.logging.format === 'pretty'
        ? winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        }))
        : winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json());
    return winston_1.default.createLogger({
        level: config.logging.level,
        format,
        transports: [new winston_1.default.transports.Console()],
    });
}
// ============================================================================
// DATABASE SETUP
// ============================================================================
function createPool(config) {
    return new pg_1.Pool({
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
function createKafka(config) {
    if (!config.kafka.enabled) {
        return undefined;
    }
    return new kafkajs_1.Kafka({
        clientId: config.kafka.clientId,
        brokers: config.kafka.brokers,
    });
}
// ============================================================================
// SCHEDULED JOBS
// ============================================================================
function setupScheduledJobs(storageManager, logger, config) {
    const jobs = [];
    // Downsampling job - runs every hour
    if (config.storage.downsamplingEnabled) {
        const downsamplingJob = new cron_1.CronJob('0 * * * *', async () => {
            logger.info('Starting scheduled downsampling job');
            try {
                const result = await storageManager.runDownsampling();
                logger.info('Downsampling job completed', { result });
            }
            catch (error) {
                logger.error('Downsampling job failed', { error });
            }
        });
        downsamplingJob.start();
        jobs.push(downsamplingJob);
    }
    // Retention cleanup job - runs daily at 3am
    const cleanupJob = new cron_1.CronJob('0 3 * * *', async () => {
        logger.info('Starting scheduled retention cleanup job');
        try {
            const result = await storageManager.runRetentionCleanup();
            logger.info('Retention cleanup job completed', { result });
        }
        catch (error) {
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
class TimeSeriesMetricsService {
    config;
    logger;
    pool;
    kafka;
    storageManager;
    queryEngine;
    ingestionPipeline;
    sloCalculator;
    app;
    server;
    scheduledJobs = [];
    constructor(config) {
        this.config = config || (0, index_js_1.loadConfig)();
        this.logger = createLogger(this.config);
        this.pool = createPool(this.config);
        this.kafka = createKafka(this.config);
        // Initialize components
        this.storageManager = new tier_manager_js_1.StorageTierManager(this.pool, this.logger);
        this.queryEngine = new query_engine_js_1.QueryEngine(this.storageManager, this.logger);
        this.ingestionPipeline = new ingestion_pipeline_js_1.IngestionPipeline(this.storageManager, this.logger, {
            batchSize: this.config.ingestion.batchSize,
            batchTimeoutMs: this.config.ingestion.batchTimeoutMs,
            enableKafka: this.config.kafka.enabled,
            kafkaTopic: this.config.kafka.topic,
            maxClockSkewMs: this.config.ingestion.maxClockSkewMs,
            futureTolerance: this.config.ingestion.futureTolerance,
            pastTolerance: this.config.ingestion.pastTolerance,
        });
        this.sloCalculator = new slo_calculator_js_1.SLOCalculator(this.queryEngine, this.logger);
        // Setup Express app
        this.app = (0, express_1.default)();
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        // Setup routes
        const router = (0, routes_js_1.createRouter)({
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
    async initialize() {
        this.logger.info('Initializing Time-Series Metrics Service...');
        // Initialize storage
        await this.storageManager.initialize();
        this.logger.info('Storage initialized');
        // Initialize ingestion pipeline
        await this.ingestionPipeline.initialize(this.kafka);
        this.logger.info('Ingestion pipeline initialized');
        // Register default tenant
        const defaultTenant = (0, tenant_js_1.createTenantConfig)('default', 'Default Tenant', tenant_js_1.TenantTier.PROFESSIONAL);
        this.ingestionPipeline.registerTenant(defaultTenant);
        // Setup scheduled jobs
        this.scheduledJobs = setupScheduledJobs(this.storageManager, this.logger, this.config);
        this.logger.info('Scheduled jobs initialized', {
            jobCount: this.scheduledJobs.length,
        });
        this.logger.info('Time-Series Metrics Service initialized');
    }
    /**
     * Start the HTTP server
     */
    async start() {
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
    async shutdown() {
        this.logger.info('Shutting down Time-Series Metrics Service...');
        // Stop scheduled jobs
        for (const job of this.scheduledJobs) {
            job.stop();
        }
        // Stop HTTP server
        if (this.server) {
            await new Promise((resolve) => {
                this.server.close(() => resolve());
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
    getApp() {
        return this.app;
    }
}
exports.TimeSeriesMetricsService = TimeSeriesMetricsService;
// ============================================================================
// EXPORTS
// ============================================================================
var tier_manager_js_2 = require("./storage/tier-manager.js");
Object.defineProperty(exports, "StorageTierManager", { enumerable: true, get: function () { return tier_manager_js_2.StorageTierManager; } });
var query_engine_js_2 = require("./query/query-engine.js");
Object.defineProperty(exports, "QueryEngine", { enumerable: true, get: function () { return query_engine_js_2.QueryEngine; } });
var ingestion_pipeline_js_2 = require("./ingestion/ingestion-pipeline.js");
Object.defineProperty(exports, "IngestionPipeline", { enumerable: true, get: function () { return ingestion_pipeline_js_2.IngestionPipeline; } });
var slo_calculator_js_2 = require("./slo/slo-calculator.js");
Object.defineProperty(exports, "SLOCalculator", { enumerable: true, get: function () { return slo_calculator_js_2.SLOCalculator; } });
__exportStar(require("./models/metric-types.js"), exports);
__exportStar(require("./models/retention-policy.js"), exports);
__exportStar(require("./models/tenant.js"), exports);
var index_js_2 = require("./config/index.js");
Object.defineProperty(exports, "loadConfig", { enumerable: true, get: function () { return index_js_2.loadConfig; } });
// ============================================================================
// MAIN
// ============================================================================
async function main() {
    const service = new TimeSeriesMetricsService();
    try {
        await service.initialize();
        await service.start();
    }
    catch (error) {
        console.error('Failed to start service:', error);
        process.exit(1);
    }
}
// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
