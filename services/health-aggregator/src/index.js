"use strict";
/**
 * Cross-System Health Aggregator Service
 * @module @intelgraph/health-aggregator
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
exports.createHealthAggregator = createHealthAggregator;
exports.createHealthServer = createHealthServer;
__exportStar(require("./health-aggregator.js"), exports);
const ioredis_1 = __importDefault(require("ioredis"));
const pino_1 = __importDefault(require("pino"));
const fastify_1 = __importDefault(require("fastify"));
const health_aggregator_js_1 = require("./health-aggregator.js");
const logger = (0, pino_1.default)({ name: 'health-aggregator' });
async function createHealthAggregator(options) {
    const redis = new ioredis_1.default(options?.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    const aggregator = new health_aggregator_js_1.HealthAggregator({ redis, logger });
    return aggregator;
}
async function createHealthServer(aggregator, port = 3400) {
    const app = (0, fastify_1.default)({ logger: true });
    // Overall health
    app.get('/health', async () => aggregator.getAggregatedStatus());
    app.get('/healthz', async () => {
        const status = aggregator.getAggregatedStatus();
        return { ok: status.overallStatus !== 'unhealthy' };
    });
    app.get('/livez', async () => ({ ok: true }));
    app.get('/readyz', async () => {
        const status = aggregator.getAggregatedStatus();
        return { ok: status.healthyComponents > 0 };
    });
    // System status
    app.get('/health/system/:system', async (request) => {
        const { system } = request.params;
        return aggregator.getSystemStatus(system);
    });
    // Component status
    app.get('/health/component/:id', async (request) => {
        const { id } = request.params;
        return aggregator.getComponentStatus(id);
    });
    // All components
    app.get('/health/components', async () => aggregator.getAllComponentStatuses());
    // Force check
    app.post('/health/check', async () => aggregator.checkAll());
    // History
    app.get('/health/history/:id', async (request) => {
        const { id } = request.params;
        const { hours } = request.query;
        return aggregator.getUptimeHistory(id, hours ? parseInt(hours) : 24);
    });
    await app.listen({ port, host: '0.0.0.0' });
    logger.info({ port }, 'Health Aggregator Server started');
    return app;
}
if (import.meta.url === `file://${process.argv[1]}`) {
    const port = Number(process.env.PORT || 3400);
    (async () => {
        const aggregator = await createHealthAggregator();
        await createHealthServer(aggregator, port);
    })().catch((error) => {
        logger.error({ error }, 'Failed to start');
        process.exit(1);
    });
}
