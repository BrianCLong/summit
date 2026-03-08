"use strict";
/**
 * Unified Audit Log Service
 * @module @intelgraph/unified-audit
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
exports.createAuditAggregator = createAuditAggregator;
exports.createAuditServer = createAuditServer;
__exportStar(require("./types.js"), exports);
__exportStar(require("./aggregator.js"), exports);
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const pino_1 = __importDefault(require("pino"));
const fastify_1 = __importDefault(require("fastify"));
const aggregator_js_1 = require("./aggregator.js");
const types_js_1 = require("./types.js");
const logger = (0, pino_1.default)({ name: 'unified-audit' });
/**
 * Create and initialize a Unified Audit Aggregator instance
 */
async function createAuditAggregator(options) {
    const postgres = new pg_1.Pool({
        connectionString: options?.postgresUrl || process.env.DATABASE_URL,
    });
    const redis = new ioredis_1.default(options?.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    const aggregator = new aggregator_js_1.UnifiedAuditAggregator({
        postgres,
        redis,
        logger,
        signingSecret: options?.signingSecret || process.env.AUDIT_SIGNING_SECRET,
    });
    await aggregator.initialize();
    return aggregator;
}
/**
 * Create HTTP server for the audit service
 */
async function createAuditServer(aggregator, port = 3200) {
    const app = (0, fastify_1.default)({ logger: true });
    // Health checks
    app.get('/healthz', async () => ({ ok: true }));
    app.get('/livez', async () => ({ ok: true }));
    // Ingest endpoint
    app.post('/ingest', async (request, reply) => {
        const eventId = await aggregator.ingest(request.body);
        return { eventId };
    });
    // Query endpoint
    app.post('/query', async (request) => {
        const params = types_js_1.AuditQuerySchema.parse(request.body);
        return aggregator.query(params);
    });
    // Aggregation endpoint
    app.get('/aggregation/:tenantId', async (request) => {
        const { tenantId } = request.params;
        const { startTime, endTime } = request.query;
        return aggregator.getAggregation(tenantId, startTime ? new Date(startTime) : new Date(Date.now() - 24 * 60 * 60 * 1000), endTime ? new Date(endTime) : new Date());
    });
    // Compliance report endpoint
    app.post('/compliance/:tenantId/:framework', async (request) => {
        const { tenantId, framework } = request.params;
        const { startTime, endTime } = request.body;
        return aggregator.generateComplianceReport(tenantId, framework, new Date(startTime), new Date(endTime));
    });
    // Forensic analysis endpoint
    app.get('/forensics/:tenantId/:correlationId', async (request) => {
        const { tenantId, correlationId } = request.params;
        return aggregator.forensicAnalysis(correlationId, tenantId);
    });
    // Integrity verification endpoint
    app.post('/verify/:tenantId', async (request) => {
        const { tenantId } = request.params;
        const { startTime, endTime } = request.body;
        return aggregator.verifyIntegrity(tenantId, startTime ? new Date(startTime) : undefined, endTime ? new Date(endTime) : undefined);
    });
    await app.listen({ port, host: '0.0.0.0' });
    logger.info({ port }, 'Unified Audit Server started');
    return app;
}
// Standalone server entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
    const port = Number(process.env.PORT || 3200);
    (async () => {
        try {
            const aggregator = await createAuditAggregator();
            await createAuditServer(aggregator, port);
            // Graceful shutdown
            const shutdown = async () => {
                logger.info('Shutting down...');
                await aggregator.shutdown();
                process.exit(0);
            };
            process.on('SIGTERM', shutdown);
            process.on('SIGINT', shutdown);
        }
        catch (error) {
            logger.error({ error }, 'Failed to start service');
            process.exit(1);
        }
    })();
}
