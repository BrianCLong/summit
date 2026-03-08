"use strict";
/**
 * Signal Bus Service Server
 *
 * Main entry point for the Signal Bus service.
 * Orchestrates the complete signal processing pipeline:
 * 1. Ingest signals from Kafka
 * 2. Validate and normalize
 * 3. Enrich with GeoIP, device lookup
 * 4. Evaluate rules and generate alerts
 * 5. Route to downstream topics
 *
 * @module server
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalBusService = void 0;
exports.createSignalBusService = createSignalBusService;
const express_1 = __importDefault(require("express"));
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const index_js_1 = require("./backpressure/index.js");
const config_js_1 = require("./config.js");
const index_js_2 = require("./enrichment/index.js");
const index_js_3 = require("./pipeline/index.js");
const index_js_4 = require("./rules/index.js");
/**
 * Signal Bus Service class
 */
class SignalBusService {
    config;
    logger;
    app;
    server;
    // Pipeline components
    validator;
    normalizer;
    enrichmentPipeline;
    ruleEvaluator;
    router;
    backpressureHandler;
    // State
    isRunning = false;
    isReady = false;
    startTime = 0;
    processedSignals = 0;
    processedAlerts = 0;
    constructor(config) {
        this.config = (0, config_js_1.loadConfig)(config);
        this.logger = (0, pino_1.default)({
            name: this.config.serviceName,
            level: this.config.logging.level,
            transport: this.config.logging.prettyPrint
                ? { target: 'pino-pretty' }
                : undefined,
        });
        this.app = (0, express_1.default)();
        // Initialize pipeline components
        this.validator = (0, index_js_3.createSignalValidator)(this.logger);
        this.normalizer = (0, index_js_3.createSignalNormalizer)(this.logger);
        this.enrichmentPipeline = (0, index_js_2.createEnrichmentPipeline)(this.logger, {
            geoIpEnabled: this.config.enrichment.geoIp.enabled,
            deviceLookupEnabled: this.config.enrichment.deviceLookup.enabled,
            timeoutMs: this.config.processing.enrichmentTimeoutMs,
        });
        this.ruleEvaluator = (0, index_js_4.createRuleEvaluator)(this.logger, {
            maxRulesPerSignal: this.config.ruleEngine.maxRulesPerSignal,
            evaluationTimeoutMs: this.config.ruleEngine.evaluationTimeoutMs,
            alertDeduplicationWindowMs: this.config.ruleEngine.alertDeduplicationWindowMs,
        });
        this.router = (0, index_js_3.createSignalRouter)(this.logger);
        this.backpressureHandler = (0, index_js_1.createBackpressureHandler)(this.logger, {
            maxQueueSize: this.config.backpressure.maxQueueSize,
            highWaterMark: this.config.backpressure.highWaterMark,
            lowWaterMark: this.config.backpressure.lowWaterMark,
            spillToDisk: this.config.backpressure.spillToDisk,
            spillDirectory: this.config.backpressure.spillDirectory,
        });
        this.setupMiddleware();
        this.setupRoutes();
        this.setupBackpressureHandlers();
    }
    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use((0, pino_http_1.default)({
            logger: this.logger,
            autoLogging: {
                ignore: (req) => req.url?.startsWith('/health') || req.url?.startsWith('/metrics'),
            },
        }));
    }
    /**
     * Setup HTTP routes
     */
    setupRoutes() {
        // Health endpoints
        this.app.get(this.config.health.path, this.handleHealth.bind(this));
        this.app.get(this.config.health.readyPath, this.handleReady.bind(this));
        this.app.get(this.config.health.livePath, this.handleLive.bind(this));
        this.app.get(this.config.health.detailedPath, this.handleDetailedHealth.bind(this));
        // Metrics endpoint
        this.app.get(this.config.metrics.path, this.handleMetrics.bind(this));
        // Signal ingestion endpoint (for HTTP-based ingestion)
        this.app.post('/api/v1/signals', this.handleSignalIngestion.bind(this));
        this.app.post('/api/v1/signals/batch', this.handleBatchIngestion.bind(this));
        // Rule management endpoints
        this.app.get('/api/v1/rules', this.handleGetRules.bind(this));
        this.app.post('/api/v1/rules', this.handleAddRule.bind(this));
        this.app.delete('/api/v1/rules/:ruleId', this.handleDeleteRule.bind(this));
        // Stats endpoint
        this.app.get('/api/v1/stats', this.handleStats.bind(this));
    }
    /**
     * Setup backpressure event handlers
     */
    setupBackpressureHandlers() {
        this.backpressureHandler.on('highWaterMark', () => {
            this.logger.warn('Backpressure: high water mark reached');
        });
        this.backpressureHandler.on('lowWaterMark', () => {
            this.logger.info('Backpressure: low water mark reached');
        });
        this.backpressureHandler.on('spillStarted', () => {
            this.logger.warn('Backpressure: spilling to disk');
        });
        this.backpressureHandler.on('spillEnded', () => {
            this.logger.info('Backpressure: spill recovery complete');
        });
        this.backpressureHandler.on('error', (error) => {
            this.logger.error({ error }, 'Backpressure error');
        });
    }
    /**
     * Process a single signal through the pipeline
     */
    async processSignal(input) {
        const startTime = Date.now();
        try {
            // 1. Validate
            const validationResult = this.validator.validateRawInput(input);
            if (!validationResult.valid) {
                return {
                    signal: null,
                    alerts: [],
                    success: false,
                    error: `Validation failed: ${validationResult.errors.map((e) => e.message).join(', ')}`,
                };
            }
            // 2. Normalize
            const envelope = this.normalizer.normalizeRawInput(input);
            // 3. Enrich
            if (this.config.enrichment.enabled) {
                const enrichmentResult = await this.enrichmentPipeline.enrich(envelope);
                if (enrichmentResult.success) {
                    Object.assign(envelope, this.enrichmentPipeline.applyEnrichment(envelope, enrichmentResult));
                }
            }
            // 4. Evaluate rules
            let alerts = [];
            if (this.config.ruleEngine.enabled) {
                const evalResult = await this.ruleEvaluator.evaluate(envelope);
                alerts = evalResult.alerts;
            }
            // 5. Route (would produce to Kafka in production)
            this.router.routeSignal(envelope);
            for (const alert of alerts) {
                this.router.routeAlert(alert);
            }
            this.processedSignals++;
            this.processedAlerts += alerts.length;
            const processingTime = Date.now() - startTime;
            this.logger.debug({
                signalId: envelope.metadata.signalId,
                signalType: envelope.metadata.signalType,
                alertCount: alerts.length,
                processingTimeMs: processingTime,
            }, 'Signal processed');
            return { signal: envelope, alerts, success: true };
        }
        catch (error) {
            this.logger.error({ error, input }, 'Signal processing failed');
            return {
                signal: null,
                alerts: [],
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Handle signal ingestion HTTP endpoint
     */
    async handleSignalIngestion(req, res) {
        try {
            const result = await this.processSignal(req.body);
            if (result.success) {
                res.status(201).json({
                    success: true,
                    signalId: result.signal.metadata.signalId,
                    alertCount: result.alerts.length,
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    error: result.error,
                });
            }
        }
        catch (error) {
            this.logger.error({ error }, 'Signal ingestion failed');
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
    /**
     * Handle batch signal ingestion
     */
    async handleBatchIngestion(req, res) {
        try {
            const signals = req.body.signals;
            if (!Array.isArray(signals)) {
                res.status(400).json({ success: false, error: 'signals must be an array' });
                return;
            }
            const results = await Promise.all(signals.map((signal) => this.processSignal(signal)));
            const successful = results.filter((r) => r.success);
            const failed = results.filter((r) => !r.success);
            res.status(200).json({
                success: true,
                processed: results.length,
                successful: successful.length,
                failed: failed.length,
                totalAlerts: successful.reduce((sum, r) => sum + r.alerts.length, 0),
                errors: failed.map((r) => r.error),
            });
        }
        catch (error) {
            this.logger.error({ error }, 'Batch ingestion failed');
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
    /**
     * Handle get rules endpoint
     */
    async handleGetRules(_req, res) {
        try {
            const rules = await this.ruleEvaluator.getAllRules();
            res.json({ rules });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get rules' });
        }
    }
    /**
     * Handle add rule endpoint
     */
    async handleAddRule(req, res) {
        try {
            await this.ruleEvaluator.addRule(req.body);
            res.status(201).json({ success: true });
        }
        catch (error) {
            res.status(400).json({ error: 'Failed to add rule' });
        }
    }
    /**
     * Handle delete rule endpoint
     */
    async handleDeleteRule(req, res) {
        try {
            await this.ruleEvaluator.deleteRule(req.params.ruleId);
            res.json({ success: true });
        }
        catch (error) {
            res.status(400).json({ error: 'Failed to delete rule' });
        }
    }
    /**
     * Handle health check
     */
    handleHealth(_req, res) {
        const result = this.getHealthCheck();
        const statusCode = result.status === 'unhealthy' ? 503 : 200;
        res.status(statusCode).json(result);
    }
    /**
     * Handle readiness check
     */
    handleReady(_req, res) {
        if (this.isReady) {
            res.status(200).json({ status: 'ready' });
        }
        else {
            res.status(503).json({ status: 'not ready' });
        }
    }
    /**
     * Handle liveness check
     */
    handleLive(_req, res) {
        if (this.isRunning) {
            res.status(200).json({ status: 'alive' });
        }
        else {
            res.status(503).json({ status: 'not alive' });
        }
    }
    /**
     * Handle detailed health check
     */
    handleDetailedHealth(_req, res) {
        const health = this.getHealthCheck();
        const metrics = this.getMetricsSnapshot();
        res.json({
            health,
            metrics,
            config: {
                serviceName: this.config.serviceName,
                serviceVersion: this.config.serviceVersion,
                nodeId: this.config.nodeId,
            },
        });
    }
    /**
     * Handle metrics endpoint
     */
    handleMetrics(_req, res) {
        const metrics = this.getMetricsSnapshot();
        // Prometheus format
        const lines = [];
        const prefix = this.config.metrics.prefix;
        lines.push(`# HELP ${prefix}uptime_seconds Service uptime in seconds`);
        lines.push(`# TYPE ${prefix}uptime_seconds gauge`);
        lines.push(`${prefix}uptime_seconds ${metrics.uptime}`);
        lines.push(`# HELP ${prefix}signals_processed_total Total signals processed`);
        lines.push(`# TYPE ${prefix}signals_processed_total counter`);
        lines.push(`${prefix}signals_processed_total ${metrics.signalsProcessed}`);
        lines.push(`# HELP ${prefix}alerts_generated_total Total alerts generated`);
        lines.push(`# TYPE ${prefix}alerts_generated_total counter`);
        lines.push(`${prefix}alerts_generated_total ${metrics.alertsGenerated}`);
        lines.push(`# HELP ${prefix}queue_size Current queue size`);
        lines.push(`# TYPE ${prefix}queue_size gauge`);
        lines.push(`${prefix}queue_size ${metrics.backpressure.queueSize}`);
        lines.push(`# HELP ${prefix}total_lag Total consumer lag`);
        lines.push(`# TYPE ${prefix}total_lag gauge`);
        lines.push(`${prefix}total_lag ${metrics.totalLag}`);
        res.set('Content-Type', 'text/plain');
        res.send(lines.join('\n'));
    }
    /**
     * Handle stats endpoint
     */
    handleStats(_req, res) {
        res.json({
            validator: this.validator.getStats(),
            normalizer: this.normalizer.getStats(),
            enrichment: this.enrichmentPipeline.getStats(),
            ruleEvaluator: this.ruleEvaluator.getStats(),
            router: this.router.getStats(),
            backpressure: this.backpressureHandler.getStats(),
        });
    }
    /**
     * Get health check result
     */
    getHealthCheck() {
        const checks = [];
        // Service running check
        checks.push({
            name: 'service',
            status: this.isRunning ? 'pass' : 'fail',
            message: this.isRunning ? 'Service is running' : 'Service is not running',
        });
        // Backpressure check
        const bpState = this.backpressureHandler.getState();
        checks.push({
            name: 'backpressure',
            status: bpState.active ? 'warn' : 'pass',
            message: bpState.active
                ? `High water mark active, queue: ${bpState.queueSize}/${bpState.maxQueueSize}`
                : 'Normal',
        });
        // Determine overall status
        const hasFailure = checks.some((c) => c.status === 'fail');
        const hasWarning = checks.some((c) => c.status === 'warn');
        return {
            status: hasFailure ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy',
            checks,
            timestamp: Date.now(),
        };
    }
    /**
     * Get metrics snapshot
     */
    getMetricsSnapshot() {
        const bpStats = this.backpressureHandler.getStats();
        return {
            timestamp: Date.now(),
            uptime: this.startTime > 0 ? (Date.now() - this.startTime) / 1000 : 0,
            signalsReceived: this.processedSignals,
            signalsProcessed: this.processedSignals,
            signalsFailed: 0,
            signalsPerSecond: 0,
            alertsGenerated: this.processedAlerts,
            alertsSuppressed: this.ruleEvaluator.getStats().alertsSuppressed,
            processingLatencyP50: 0,
            processingLatencyP95: 0,
            processingLatencyP99: 0,
            backpressure: this.backpressureHandler.getState(),
            totalLag: bpStats.totalLag,
            lagByTenant: new Map(),
        };
    }
    /**
     * Start the service
     */
    async start() {
        if (this.isRunning) {
            this.logger.warn('Service is already running');
            return;
        }
        this.logger.info({
            serviceName: this.config.serviceName,
            version: this.config.serviceVersion,
            nodeId: this.config.nodeId,
        }, 'Starting Signal Bus Service');
        this.startTime = Date.now();
        // Start HTTP server
        await new Promise((resolve) => {
            this.server = this.app.listen(this.config.server.port, this.config.server.host, () => {
                this.logger.info({ port: this.config.server.port, host: this.config.server.host }, 'HTTP server listening');
                resolve();
            });
        });
        this.isRunning = true;
        this.isReady = true;
        this.logger.info('Signal Bus Service started successfully');
    }
    /**
     * Stop the service
     */
    async stop() {
        if (!this.isRunning) {
            this.logger.warn('Service is not running');
            return;
        }
        this.logger.info('Stopping Signal Bus Service');
        this.isReady = false;
        // Stop HTTP server
        if (this.server) {
            await new Promise((resolve, reject) => {
                this.server.close((err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
        }
        // Shutdown backpressure handler
        await this.backpressureHandler.shutdown();
        this.isRunning = false;
        this.logger.info('Signal Bus Service stopped');
    }
    /**
     * Get the Express app (for testing)
     */
    getApp() {
        return this.app;
    }
    /**
     * Check if service is running
     */
    getIsRunning() {
        return this.isRunning;
    }
    /**
     * Check if service is ready
     */
    getIsReady() {
        return this.isReady;
    }
}
exports.SignalBusService = SignalBusService;
/**
 * Create and start the service
 */
async function createSignalBusService(config) {
    const service = new SignalBusService(config);
    return service;
}
// Main entry point
if (process.argv[1]?.endsWith('server.js') || process.argv[1]?.endsWith('server.ts')) {
    const service = new SignalBusService();
    // Graceful shutdown
    const shutdown = async (signal) => {
        console.log(`Received ${signal}, shutting down...`);
        await service.stop();
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    service.start().catch((error) => {
        console.error('Failed to start service:', error);
        process.exit(1);
    });
}
