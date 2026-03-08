"use strict";
/**
 * Audit Black Box Service
 *
 * Immutable audit flight recorder with tamper-evident storage for IntelGraph.
 * Provides:
 * - Cryptographic hash chain for tamper detection
 * - Merkle tree checkpoints for efficient verification
 * - Strict authorization for audit access
 * - RTBF compliance via tombstone-based redaction
 * - Comprehensive APIs for search, export, and verification
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
exports.AuditBlackBoxService = exports.IntegrityVerifier = exports.RedactionService = exports.AuditEventBuffer = exports.ImmutableAuditStore = void 0;
exports.createService = createService;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const pg_1 = require("pg");
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const immutable_store_js_1 = require("./store/immutable-store.js");
const event_buffer_js_1 = require("./core/event-buffer.js");
const redaction_service_js_1 = require("./redaction/redaction-service.js");
const integrity_verifier_js_1 = require("./verification/integrity-verifier.js");
const audit_api_js_1 = require("./api/audit-api.js");
const types_js_1 = require("./core/types.js");
// Re-export types and components
__exportStar(require("./core/types.js"), exports);
var immutable_store_js_2 = require("./store/immutable-store.js");
Object.defineProperty(exports, "ImmutableAuditStore", { enumerable: true, get: function () { return immutable_store_js_2.ImmutableAuditStore; } });
var event_buffer_js_2 = require("./core/event-buffer.js");
Object.defineProperty(exports, "AuditEventBuffer", { enumerable: true, get: function () { return event_buffer_js_2.AuditEventBuffer; } });
var redaction_service_js_2 = require("./redaction/redaction-service.js");
Object.defineProperty(exports, "RedactionService", { enumerable: true, get: function () { return redaction_service_js_2.RedactionService; } });
var integrity_verifier_js_2 = require("./verification/integrity-verifier.js");
Object.defineProperty(exports, "IntegrityVerifier", { enumerable: true, get: function () { return integrity_verifier_js_2.IntegrityVerifier; } });
/**
 * Audit Black Box Service
 */
class AuditBlackBoxService {
    app;
    pool;
    store;
    buffer;
    redactionService;
    verifier;
    config;
    logger;
    server;
    constructor(config) {
        // Merge with defaults
        this.config = {
            ...types_js_1.DEFAULT_CONFIG,
            ...config,
        };
        // Initialize logger
        this.logger = (0, pino_1.default)({
            level: this.config.logLevel,
            transport: process.env.NODE_ENV !== 'production'
                ? { target: 'pino-pretty' }
                : undefined,
        });
        // Initialize PostgreSQL connection pool
        this.pool = new pg_1.Pool({
            host: this.config.postgres.host,
            port: this.config.postgres.port,
            database: this.config.postgres.database,
            user: this.config.postgres.user,
            password: this.config.postgres.password,
            ssl: this.config.postgres.ssl,
            max: this.config.postgres.poolSize || 20,
        });
        // Initialize store
        this.store = new immutable_store_js_1.ImmutableAuditStore(this.pool, this.config);
        // Initialize buffer with flush to store
        this.buffer = new event_buffer_js_1.AuditEventBuffer({
            maxSize: this.config.maxBufferSize,
            flushIntervalMs: this.config.flushIntervalMs,
            batchSize: this.config.batchSize,
            backpressureThreshold: 0.8,
            criticalEventsBypass: true,
            onFlush: async (events) => {
                await this.store.appendEventsBatch(events);
            },
            onDrop: (event, reason) => {
                this.logger.warn({ eventId: event.id, reason }, 'Audit event dropped');
            },
            onBackpressure: (active) => {
                this.logger.warn({ active }, 'Backpressure status changed');
            },
        });
        // Initialize redaction service
        this.redactionService = new redaction_service_js_1.RedactionService(this.pool, this.store, this.config);
        // Initialize verifier
        this.verifier = new integrity_verifier_js_1.IntegrityVerifier(this.pool, this.config);
        // Initialize Express app
        this.app = (0, express_1.default)();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupEventHandlers();
    }
    /**
     * Start the service
     */
    async start() {
        this.logger.info('Starting Audit Black Box Service...');
        // Initialize store schema
        await this.store.initialize();
        this.logger.info('Immutable store initialized');
        // Initialize redaction service schema
        await this.redactionService.initialize();
        this.logger.info('Redaction service initialized');
        // Start HTTP server
        return new Promise((resolve) => {
            this.server = this.app.listen(this.config.apiPort, this.config.apiHost, () => {
                this.logger.info({ port: this.config.apiPort, host: this.config.apiHost }, 'Audit Black Box Service started');
                resolve();
            });
        });
    }
    /**
     * Stop the service gracefully
     */
    async stop() {
        this.logger.info('Stopping Audit Black Box Service...');
        // Shutdown buffer (flush remaining events)
        await this.buffer.shutdown();
        this.logger.info('Buffer flushed');
        // Close HTTP server
        if (this.server) {
            await new Promise((resolve, reject) => {
                this.server.close((err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            this.logger.info('HTTP server stopped');
        }
        // Close database pool
        await this.pool.end();
        this.logger.info('Database pool closed');
        this.logger.info('Audit Black Box Service stopped');
    }
    /**
     * Get the Express app (for testing)
     */
    getApp() {
        return this.app;
    }
    /**
     * Get the store (for testing)
     */
    getStore() {
        return this.store;
    }
    /**
     * Get the buffer (for testing)
     */
    getBuffer() {
        return this.buffer;
    }
    /**
     * Get the redaction service (for testing)
     */
    getRedactionService() {
        return this.redactionService;
    }
    /**
     * Get the verifier (for testing)
     */
    getVerifier() {
        return this.verifier;
    }
    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        // Security headers
        this.app.use((0, helmet_1.default)());
        // CORS
        this.app.use((0, cors_1.default)({
            origin: this.config.corsOrigins,
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: [
                'Content-Type',
                'Authorization',
                'X-User-Id',
                'X-Tenant-Id',
                'X-User-Roles',
                'X-User-Permissions',
                'X-Correlation-Id',
            ],
        }));
        // Request logging
        this.app.use((0, pino_http_1.default)({
            logger: this.logger,
            autoLogging: {
                ignore: (req) => req.url === '/audit/health',
            },
        }));
        // Trust proxy
        this.app.set('trust proxy', 1);
    }
    /**
     * Setup routes
     */
    setupRoutes() {
        // Mount audit API
        const auditRouter = (0, audit_api_js_1.createAuditRouter)(this.store, this.pool, this.config);
        this.app.use('/audit', auditRouter);
        // Root health check
        this.app.get('/health', (_req, res) => {
            res.json({ status: 'ok', service: 'audit-blackbox-service' });
        });
        // 404 handler
        this.app.use((_req, res) => {
            res.status(404).json({ error: 'Not found' });
        });
        // Error handler
        this.app.use((err, _req, res, _next) => {
            this.logger.error({ err }, 'Unhandled error');
            res.status(500).json({ error: 'Internal server error' });
        });
    }
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Store events
        this.store.on('initialized', (data) => {
            this.logger.info(data, 'Store initialized');
        });
        this.store.on('eventAppended', (data) => {
            this.logger.debug(data, 'Event appended');
        });
        this.store.on('checkpointCreated', (checkpoint) => {
            this.logger.info({ checkpointId: checkpoint.id, sequence: checkpoint.endSequence.toString() }, 'Merkle checkpoint created');
        });
        this.store.on('error', (data) => {
            this.logger.error(data, 'Store error');
        });
        // Buffer events
        this.buffer.on('backpressure', (active) => {
            this.logger.warn({ active }, 'Buffer backpressure');
        });
        this.buffer.on('flushed', (data) => {
            this.logger.debug(data, 'Buffer flushed');
        });
        this.buffer.on('dropped', (data) => {
            this.logger.warn(data, 'Event dropped');
        });
        this.buffer.on('error', (err) => {
            this.logger.error({ err }, 'Buffer error');
        });
        // Redaction events
        this.redactionService.on('requestSubmitted', (request) => {
            this.logger.info({ requestId: request.id, subjectUserId: request.subjectUserId }, 'Redaction request submitted');
        });
        this.redactionService.on('redactionExecuted', (data) => {
            this.logger.warn(data, 'Redaction executed');
        });
        // Verifier events
        this.verifier.on('progress', (data) => {
            this.logger.debug(data, 'Verification progress');
        });
        this.verifier.on('complete', (report) => {
            this.logger.info({
                valid: report.valid,
                totalEvents: report.summary.totalEvents,
                issues: report.issues.length,
            }, 'Verification complete');
        });
    }
}
exports.AuditBlackBoxService = AuditBlackBoxService;
/**
 * Create and start the service
 */
async function createService(config) {
    const service = new AuditBlackBoxService(config);
    await service.start();
    return service;
}
// Start service if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const config = {
        postgres: {
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
            database: process.env.POSTGRES_DATABASE || 'audit_blackbox',
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'postgres',
        },
        signingKey: process.env.AUDIT_SIGNING_KEY || 'dev-signing-key-change-in-production',
        apiPort: parseInt(process.env.API_PORT || '4001', 10),
        apiHost: process.env.API_HOST || '0.0.0.0',
        logLevel: process.env.LOG_LEVEL || 'info',
    };
    createService(config).catch((err) => {
        console.error('Failed to start service:', err);
        process.exit(1);
    });
}
