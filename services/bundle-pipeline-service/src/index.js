"use strict";
/**
 * Bundle Pipeline Service - Main Entry Point
 * Evidence Bundle & Briefing Pipeline for IntelGraph
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
exports.GovernanceClient = exports.CaseClient = exports.ProvenanceClient = exports.BundleRepository = exports.ManifestService = exports.SchedulingService = exports.PublishingService = exports.BriefingAssemblyService = exports.BundleAssemblyService = void 0;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const pg_1 = require("pg");
const pino_1 = __importDefault(require("pino"));
const routes_js_1 = require("./api/routes.js");
const BundleAssemblyService_js_1 = require("./services/BundleAssemblyService.js");
const BriefingAssemblyService_js_1 = require("./services/BriefingAssemblyService.js");
const PublishingService_js_1 = require("./services/PublishingService.js");
const SchedulingService_js_1 = require("./services/SchedulingService.js");
const ProvenanceClient_js_1 = require("./clients/ProvenanceClient.js");
const CaseClient_js_1 = require("./clients/CaseClient.js");
const GovernanceClient_js_1 = require("./clients/GovernanceClient.js");
// Re-export types
__exportStar(require("./types/index.js"), exports);
var BundleAssemblyService_js_2 = require("./services/BundleAssemblyService.js");
Object.defineProperty(exports, "BundleAssemblyService", { enumerable: true, get: function () { return BundleAssemblyService_js_2.BundleAssemblyService; } });
var BriefingAssemblyService_js_2 = require("./services/BriefingAssemblyService.js");
Object.defineProperty(exports, "BriefingAssemblyService", { enumerable: true, get: function () { return BriefingAssemblyService_js_2.BriefingAssemblyService; } });
var PublishingService_js_2 = require("./services/PublishingService.js");
Object.defineProperty(exports, "PublishingService", { enumerable: true, get: function () { return PublishingService_js_2.PublishingService; } });
var SchedulingService_js_2 = require("./services/SchedulingService.js");
Object.defineProperty(exports, "SchedulingService", { enumerable: true, get: function () { return SchedulingService_js_2.SchedulingService; } });
var ManifestService_js_1 = require("./services/ManifestService.js");
Object.defineProperty(exports, "ManifestService", { enumerable: true, get: function () { return ManifestService_js_1.ManifestService; } });
var BundleRepository_js_1 = require("./repositories/BundleRepository.js");
Object.defineProperty(exports, "BundleRepository", { enumerable: true, get: function () { return BundleRepository_js_1.BundleRepository; } });
var ProvenanceClient_js_2 = require("./clients/ProvenanceClient.js");
Object.defineProperty(exports, "ProvenanceClient", { enumerable: true, get: function () { return ProvenanceClient_js_2.ProvenanceClient; } });
var CaseClient_js_2 = require("./clients/CaseClient.js");
Object.defineProperty(exports, "CaseClient", { enumerable: true, get: function () { return CaseClient_js_2.CaseClient; } });
var GovernanceClient_js_2 = require("./clients/GovernanceClient.js");
Object.defineProperty(exports, "GovernanceClient", { enumerable: true, get: function () { return GovernanceClient_js_2.GovernanceClient; } });
// Configuration
const config = {
    port: parseInt(process.env.PORT || '3500', 10),
    host: process.env.HOST || '0.0.0.0',
    logLevel: process.env.LOG_LEVEL || 'info',
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'intelgraph',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        max: parseInt(process.env.DB_POOL_SIZE || '20', 10),
    },
    services: {
        provenanceUrl: process.env.PROVENANCE_SERVICE_URL || 'http://localhost:3501',
        caseUrl: process.env.CASE_SERVICE_URL || 'http://localhost:4000',
        governanceUrl: process.env.GOVERNANCE_SERVICE_URL || 'http://localhost:3502',
    },
};
// Initialize logger
const logger = (0, pino_1.default)({
    level: config.logLevel,
    transport: process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
});
// Initialize database pool
const pool = new pg_1.Pool(config.database);
// Initialize clients
const provenanceClient = new ProvenanceClient_js_1.ProvenanceClient(config.services.provenanceUrl, logger);
const caseClient = new CaseClient_js_1.CaseClient(config.services.caseUrl, logger);
const governanceClient = new GovernanceClient_js_1.GovernanceClient(config.services.governanceUrl, logger);
// Initialize services
const bundleAssemblyService = new BundleAssemblyService_js_1.BundleAssemblyService(pool, provenanceClient, caseClient, governanceClient, logger);
const briefingAssemblyService = new BriefingAssemblyService_js_1.BriefingAssemblyService(pool, provenanceClient, caseClient, governanceClient, logger);
const publishingService = new PublishingService_js_1.PublishingService(pool, provenanceClient, governanceClient, logger);
const schedulingService = new SchedulingService_js_1.SchedulingService(pool, briefingAssemblyService, logger);
// Initialize Fastify
const app = (0, fastify_1.default)({
    logger: logger,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
});
// Register plugins
await app.register(cors_1.default, {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
});
await app.register(helmet_1.default, {
    contentSecurityPolicy: false,
});
// Register routes
const services = {
    bundleAssembly: bundleAssemblyService,
    briefingAssembly: briefingAssemblyService,
    publishing: publishingService,
    scheduling: schedulingService,
};
await (0, routes_js_1.registerRoutes)(app, services, logger);
// Graceful shutdown handler
const shutdown = async (signal) => {
    logger.info({ signal }, 'Received shutdown signal');
    try {
        // Stop accepting new connections
        await app.close();
        // Shutdown scheduling service
        await schedulingService.shutdown();
        // Close database pool
        await pool.end();
        logger.info('Graceful shutdown completed');
        process.exit(0);
    }
    catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
    }
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
// Start server
const start = async () => {
    try {
        // Test database connection
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        logger.info('Database connection established');
        // Initialize scheduling service
        await schedulingService.initialize();
        logger.info('Scheduling service initialized');
        // Start listening
        await app.listen({ port: config.port, host: config.host });
        logger.info({ port: config.port, host: config.host }, 'Bundle Pipeline Service started');
    }
    catch (err) {
        logger.error({ err }, 'Failed to start server');
        process.exit(1);
    }
};
start();
