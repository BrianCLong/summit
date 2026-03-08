"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Ensure OpenTelemetry instrumentation runs before anything else
require("./instrumentation.js");
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const graphql_1 = require("graphql");
// @ts-ignore
const ws_1 = require("graphql-ws/lib/use/ws");
const ws_2 = require("ws");
const node_crypto_1 = require("node:crypto");
const VoiceGateway_js_1 = require("./gateways/VoiceGateway.js");
const auth_js_1 = require("./lib/auth.js");
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const schema_1 = require("@graphql-tools/schema");
const schema_js_1 = require("./graphql/schema.js");
const index_js_1 = __importDefault(require("./graphql/resolvers/index.js"));
const subscriptionEngine_js_1 = require("./graphql/subscriptionEngine.js");
const DataRetentionService_js_1 = require("./services/DataRetentionService.js");
const neo4j_js_1 = require("./db/neo4j.js");
const config_js_1 = require("./config.js");
const tracer_js_1 = require("./observability/tracer.js");
const streaming_js_1 = require("./routes/streaming.js");
const OSINTQueueService_js_1 = require("./services/OSINTQueueService.js");
const BackupManager_js_1 = require("./backup/BackupManager.js");
const indexManager_js_1 = require("./db/indexManager.js");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const bootstrap_secrets_js_1 = require("./bootstrap-secrets.js");
const logger_js_1 = require("./config/logger.js");
const app_js_1 = require("./app.js");
require("./monitoring/metrics.js"); // Initialize Prometheus metrics collection
const PartitionMaintenanceService_js_1 = require("./services/PartitionMaintenanceService.js");
const ZeroTouchOrchestrator_js_1 = require("./conductor/deployment/ZeroTouchOrchestrator.js");
const DriftRemediationService_js_1 = require("./services/DriftRemediationService.js");
const ProjectSunsettingService_js_1 = require("./services/ProjectSunsettingService.js");
const startServer = async () => {
    // Initialize OpenTelemetry tracing early in the startup sequence
    const tracer = (0, tracer_js_1.initializeTracing)();
    await tracer.initialize();
    // Optional Kafka consumer import - only when AI services enabled
    let startKafkaConsumer = null;
    let stopKafkaConsumer = null;
    if (process.env.AI_ENABLED === 'true' ||
        process.env.KAFKA_ENABLED === 'true') {
        try {
            const kafkaModule = await Promise.resolve().then(() => __importStar(require('./realtime/kafkaConsumer.js')));
            startKafkaConsumer = kafkaModule.startKafkaConsumer;
            stopKafkaConsumer = kafkaModule.stopKafkaConsumer;
        }
        catch (error) {
            logger_js_1.logger.warn('Kafka not available - running in minimal mode');
        }
    }
    // 1. Load Secrets (Environment or Vault)
    await (0, bootstrap_secrets_js_1.bootstrapSecrets)();
    // Log Config
    const app = await (0, app_js_1.createApp)();
    const schema = (0, schema_1.makeExecutableSchema)({ typeDefs: schema_js_1.typeDefs, resolvers: index_js_1.default });
    const httpServer = http_1.default.createServer(app);
    if (process.env.REQUIRE_REAL_DBS !== 'false') {
        if (!process.env.DISABLE_NEO4J) {
            await (0, neo4j_js_1.initializeNeo4jDriver)();
        }
    }
    else {
        logger_js_1.logger.info('REQUIRE_REAL_DBS=false, skipping Neo4j driver initialization');
    }
    // Subscriptions with Persisted Query validation
    const wss = new ws_2.WebSocketServer({
        server: httpServer,
        path: '/graphql',
    });
    const voiceWss = new ws_2.WebSocketServer({
        server: httpServer,
        path: '/speak',
    });
    new VoiceGateway_js_1.VoiceGateway(voiceWss);
    (0, ws_1.useServer)({
        schema,
        context: async (ctx) => {
            const request = ctx.extra.request ?? ctx.extra;
            const baseContext = await (0, auth_js_1.getContext)({ req: request });
            return {
                ...baseContext,
                connectionId: ctx.extra.connectionId,
                pubsub: subscriptionEngine_js_1.subscriptionEngine.getPubSub(),
                subscriptionEngine: subscriptionEngine_js_1.subscriptionEngine,
            };
        },
        onConnect: (ctx) => {
            const connectionId = (0, node_crypto_1.randomUUID)();
            ctx.extra.connectionId = connectionId;
            subscriptionEngine_js_1.subscriptionEngine.registerConnection(connectionId, ctx.extra.socket);
        },
        onSubscribe: (ctx, msg) => {
            const socket = ctx.extra.socket;
            if (!subscriptionEngine_js_1.subscriptionEngine.enforceBackpressure(socket)) {
                return [new graphql_1.GraphQLError('Backpressure threshold exceeded')];
            }
            const connectionId = ctx.extra.connectionId;
            if (connectionId) {
                subscriptionEngine_js_1.subscriptionEngine.trackSubscription(connectionId, msg.id);
            }
            ctx.extra.lastFanoutStart = process.hrtime.bigint();
        },
        onNext: (ctx) => {
            const startedAt = ctx.extra.lastFanoutStart ?? process.hrtime.bigint();
            subscriptionEngine_js_1.subscriptionEngine.recordFanout(startedAt);
            ctx.extra.lastFanoutStart = process.hrtime.bigint();
        },
        onComplete: (ctx, msg) => {
            const connectionId = ctx.extra.connectionId;
            if (connectionId) {
                subscriptionEngine_js_1.subscriptionEngine.completeSubscription(connectionId, msg?.id);
            }
        },
        onError: (ctx, msg, errors) => {
            logger_js_1.logger.error({ errors, operationId: msg?.id, connectionId: ctx.extra.connectionId }, 'GraphQL WS subscription error');
        },
        onClose: (ctx) => {
            const connectionId = ctx.extra.connectionId;
            if (connectionId) {
                subscriptionEngine_js_1.subscriptionEngine.unregisterConnection(connectionId);
            }
        },
        // ...wsMiddleware,
    }, wss);
    if (config_js_1.cfg.NODE_ENV === 'production') {
        const clientDistPath = path_1.default.resolve(__dirname, '../../client/dist');
        app.use(express_1.default.static(clientDistPath));
        app.get('*', (_req, res) => {
            res.sendFile(path_1.default.join(clientDistPath, 'index.html'));
        });
    }
    const { initSocket, getIO } = await Promise.resolve().then(() => __importStar(require('./realtime/socket.js'))); // JWT auth
    const port = Number(config_js_1.cfg.PORT || 4000);
    httpServer.listen(port, async () => {
        logger_js_1.logger.info(`Server listening on port ${port}`);
        // Initialize and start Data Retention Service
        if (!process.env.DISABLE_NEO4J) {
            const neo4jDriver = (0, neo4j_js_1.getNeo4jDriver)();
            const dataRetentionService = new DataRetentionService_js_1.DataRetentionService(neo4jDriver);
            dataRetentionService.startCleanupJob(); // Start the cleanup job
        }
        // Start OSINT Workers
        (0, OSINTQueueService_js_1.startOSINTWorkers)();
        // Initialize Backup Manager
        const backupManager = new BackupManager_js_1.BackupManager();
        backupManager.startScheduler();
        // Start Policy Watcher (WS-2)
        const { PolicyWatcher } = await Promise.resolve().then(() => __importStar(require('./services/governance/PolicyWatcher.js')));
        const policyWatcher = PolicyWatcher.getInstance();
        policyWatcher.start();
        // Start GA Core Metrics Service
        const { gaCoreMetrics } = await Promise.resolve().then(() => __importStar(require('./services/GACoremetricsService.js')));
        gaCoreMetrics.start();
        // Check Neo4j Indexes
        if (!process.env.DISABLE_NEO4J) {
            (0, indexManager_js_1.checkNeo4jIndexes)().catch(err => logger_js_1.logger.error('Failed to run initial index check', err));
        }
        // Start Partition Maintenance Service
        PartitionMaintenanceService_js_1.partitionMaintenanceService.start();
        // Start Zero-Touch Deployment Orchestrator
        ZeroTouchOrchestrator_js_1.zeroTouchOrchestrator.start().catch(err => logger_js_1.logger.error('Failed to start ZeroTouchOrchestrator', err));
        // Start Drift Remediation Service (Self-Healing)
        DriftRemediationService_js_1.driftRemediationService.start();
        // Start Project Sunsetting Service (Lifecycle Automation)
        ProjectSunsettingService_js_1.projectSunsettingService.start();
        // WAR-GAMED SIMULATION - Start Kafka Consumer
        if (typeof startKafkaConsumer === 'function') {
            await startKafkaConsumer();
        }
        // Create sample data for development
        if (process.env.NODE_ENV === 'development') {
            setTimeout(async () => {
                try {
                    const { createSampleData } = await Promise.resolve().then(() => __importStar(require('./utils/sampleData.js')));
                    await createSampleData();
                }
                catch (error) {
                    logger_js_1.logger.warn('Failed to create sample data, continuing without it');
                }
            }, 2000); // Wait 2 seconds for connections to be established
        }
    });
    // Initialize Socket.IO
    const io = initSocket(httpServer);
    const { closeNeo4jDriver } = await Promise.resolve().then(() => __importStar(require('./db/neo4j.js')));
    const { closePostgresPool } = await Promise.resolve().then(() => __importStar(require('./db/postgres.js')));
    const { closeRedisClient } = await Promise.resolve().then(() => __importStar(require('./db/redis.js')));
    // Graceful shutdown
    const shutdown = async (sig) => {
        logger_js_1.logger.info(`Shutting down. Signal: ${sig}`);
        // Stop Policy Watcher
        const { PolicyWatcher } = await Promise.resolve().then(() => __importStar(require('./services/governance/PolicyWatcher.js')));
        PolicyWatcher.getInstance().stop();
        PartitionMaintenanceService_js_1.partitionMaintenanceService.stop();
        wss.close();
        io.close(); // Close Socket.IO server
        streaming_js_1.streamingRateLimiter.destroy();
        if (stopKafkaConsumer) {
            await stopKafkaConsumer();
        } // WAR-GAMED SIMULATION - Stop Kafka Consumer
        // Shutdown OpenTelemetry
        await (0, tracer_js_1.getTracer)().shutdown();
        const shutdownPromises = [
            closePostgresPool(),
            closeRedisClient(),
        ];
        if (!process.env.DISABLE_NEO4J) {
            shutdownPromises.push(closeNeo4jDriver());
        }
        await Promise.allSettled(shutdownPromises);
        httpServer.close((err) => {
            if (err) {
                logger_js_1.logger.error(`Error during shutdown: ${err instanceof Error ? err.message : 'Unknown error'}`);
                process.exitCode = 1;
            }
            process.exit();
        });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
};
startServer().catch((err) => {
    logger_js_1.logger.error(`Fatal error during startup: ${err}`);
    process.exit(1);
});
