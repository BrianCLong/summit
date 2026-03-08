"use strict";
/**
 * CompanyOS-driven Feature Flags and Access Policies
 * @module @intelgraph/feature-flags
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
exports.createFeatureFlagService = createFeatureFlagService;
exports.createFeatureFlagServer = createFeatureFlagServer;
__exportStar(require("./feature-flag-service.js"), exports);
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const pino_1 = __importDefault(require("pino"));
const fastify_1 = __importDefault(require("fastify"));
const feature_flag_service_js_1 = require("./feature-flag-service.js");
const logger = (0, pino_1.default)({ name: 'feature-flags' });
async function createFeatureFlagService(options) {
    const postgres = new pg_1.Pool({
        connectionString: options?.postgresUrl || process.env.DATABASE_URL,
    });
    const redis = new ioredis_1.default(options?.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    const service = new feature_flag_service_js_1.FeatureFlagService({
        postgres,
        redis,
        logger,
        opaUrl: options?.opaUrl,
    });
    await service.initialize();
    return service;
}
async function createFeatureFlagServer(service, port = 3300) {
    const app = (0, fastify_1.default)({ logger: true });
    app.get('/healthz', async () => ({ ok: true }));
    // Evaluate flag
    app.post('/evaluate/:key', async (request) => {
        const { key } = request.params;
        const context = request.body;
        return service.evaluate(key, context);
    });
    // Evaluate all flags
    app.post('/evaluate-all', async (request) => {
        const context = request.body;
        return service.evaluateAll(context);
    });
    // CRUD operations
    app.post('/flags', async (request) => service.createFlag(request.body));
    app.get('/flags/:tenantId', async (request) => {
        const { tenantId } = request.params;
        return service.listFlags(tenantId, request.query);
    });
    app.get('/flags/:tenantId/:key', async (request) => {
        const { tenantId, key } = request.params;
        return service.getFlag(key, tenantId);
    });
    app.put('/flags/:tenantId/:key', async (request) => {
        const { tenantId, key } = request.params;
        return service.updateFlag(key, tenantId, request.body);
    });
    app.delete('/flags/:tenantId/:key', async (request) => {
        const { tenantId, key } = request.params;
        return service.deleteFlag(key, tenantId);
    });
    // Stats
    app.get('/stats/:tenantId', async (request) => {
        const { tenantId } = request.params;
        const { flagKey, hours } = request.query;
        return service.getStats(tenantId, flagKey, hours ? parseInt(hours) : 24);
    });
    await app.listen({ port, host: '0.0.0.0' });
    logger.info({ port }, 'Feature Flag Server started');
    return app;
}
if (import.meta.url === `file://${process.argv[1]}`) {
    const port = Number(process.env.PORT || 3300);
    (async () => {
        const service = await createFeatureFlagService();
        await createFeatureFlagServer(service, port);
    })().catch((error) => {
        logger.error({ error }, 'Failed to start');
        process.exit(1);
    });
}
