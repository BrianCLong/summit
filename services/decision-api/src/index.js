"use strict";
// @ts-nocheck
/**
 * Decision Graph API Service
 * REST API for managing decision provenance graphs
 *
 * Endpoints:
 * - POST /api/v1/entities - Create entity
 * - POST /api/v1/claims - Create claim
 * - POST /api/v1/evidence - Create evidence
 * - POST /api/v1/decisions - Create decision
 * - GET /api/v1/decisions/:id/graph - Get decision graph
 * - POST /api/v1/decisions/:id/approve - Approve decision
 * - GET /api/v1/decisions/:id/disclosure - Generate disclosure pack
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.pool = void 0;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const pg_1 = require("pg");
const entities_js_1 = require("./routes/entities.js");
const claims_js_1 = require("./routes/claims.js");
const evidence_js_1 = require("./routes/evidence.js");
const decisions_js_1 = require("./routes/decisions.js");
const queries_js_1 = require("./routes/queries.js");
const disclosure_js_1 = require("./routes/disclosure.js");
const health_js_1 = require("./routes/health.js");
const auth_js_1 = require("./middleware/auth.js");
const audit_js_1 = require("./middleware/audit.js");
const service_auth_js_1 = require("./middleware/service-auth.js");
const PORT = parseInt(process.env.PORT || '4020');
const NODE_ENV = process.env.NODE_ENV || 'development';
// Database connection pool
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL ||
        'postgres://postgres:postgres@localhost:5432/decision_graph',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
// Create Fastify instance
const server = (0, fastify_1.default)({
    logger: {
        level: NODE_ENV === 'development' ? 'debug' : 'info',
        ...(NODE_ENV === 'development'
            ? { transport: { target: 'pino-pretty' } }
            : {}),
    },
});
exports.server = server;
// Register plugins
await server.register(helmet_1.default);
await server.register(cors_1.default, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
});
// Register middleware
server.addHook('preHandler', service_auth_js_1.serviceAuthMiddleware);
server.addHook('preHandler', auth_js_1.authMiddleware);
server.addHook('onResponse', audit_js_1.auditMiddleware);
// Register routes
await server.register(health_js_1.healthRoutes, { prefix: '/health' });
await server.register(entities_js_1.entityRoutes, { prefix: '/api/v1/entities' });
await server.register(claims_js_1.claimRoutes, { prefix: '/api/v1/claims' });
await server.register(evidence_js_1.evidenceRoutes, { prefix: '/api/v1/evidence' });
await server.register(decisions_js_1.decisionRoutes, { prefix: '/api/v1/decisions' });
await server.register(queries_js_1.queryRoutes, { prefix: '/api/v1/query' });
await server.register(disclosure_js_1.disclosureRoutes, { prefix: '/api/v1/disclosure' });
// Graceful shutdown
const shutdown = async () => {
    server.log.info('Shutting down...');
    await server.close();
    await exports.pool.end();
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// Start server
const start = async () => {
    try {
        await server.listen({ port: PORT, host: '0.0.0.0' });
        server.log.info(`🔍 Decision API service ready at http://localhost:${PORT}`);
        server.log.info(`📖 API docs at http://localhost:${PORT}/documentation`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
