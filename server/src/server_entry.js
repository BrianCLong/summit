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
// @ts-nocheck
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const express_1 = __importDefault(require("express"));
const ws_1 = require("graphql-ws/use/ws");
const ws_2 = require("ws");
const pino_1 = __importDefault(require("pino"));
const auth_js_1 = require("./lib/auth.js");
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
// import WSPersistedQueriesMiddleware from "./graphql/middleware/wsPersistedQueries.js";
const otel_js_1 = require("./lib/observability/otel.js");
// Initialize OpenTelemetry as early as possible
otel_js_1.otelService.initialize();
const app_js_1 = require("./app.js");
const schema_1 = require("@graphql-tools/schema");
const schema_js_1 = require("./graphql/schema.js");
const index_js_1 = __importDefault(require("./graphql/resolvers/index.js"));
const DataRetentionService_js_1 = require("./services/DataRetentionService.js");
const neo4j_js_1 = require("./db/neo4j.js");
const config_js_1 = require("./config.js");
const streaming_js_1 = require("./routes/streaming.js");
const hotEmbeddingsRefresh_js_1 = require("./jobs/hotEmbeddingsRefresh.js");
const evidenceIntegrityJob_js_1 = require("./jobs/evidenceIntegrityJob.js");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const logger = pino_1.default();
/**
 * Starts the main API server.
 * @trace FEAT-BOOTSTRAP
 */
const startServer = async () => {
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
            logger.warn('Kafka not available - running in minimal mode');
        }
    }
    const app = await (0, app_js_1.createApp)();
    const schema = (0, schema_1.makeExecutableSchema)({ typeDefs: schema_js_1.typeDefs, resolvers: index_js_1.default });
    let httpServer;
    if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
        logger.info('Starting server with HTTPS (TLS 1.3)');
        try {
            const httpsOptions = {
                key: fs_1.default.readFileSync(process.env.SSL_KEY_PATH),
                cert: fs_1.default.readFileSync(process.env.SSL_CERT_PATH),
                minVersion: 'TLSv1.3', // Enforce TLS 1.3
            };
            httpServer = https_1.default.createServer(httpsOptions, app);
        }
        catch (error) {
            logger.error(`Failed to load SSL certs: ${error}`);
            process.exit(1);
        }
    }
    else {
        logger.warn('SSL not configured, falling back to HTTP (Not recommended for production)');
        httpServer = http_1.default.createServer(app);
    }
    await (0, neo4j_js_1.initializeNeo4jDriver)();
    // Subscriptions with Persisted Query validation
    const wss = new ws_2.WebSocketServer({
        server: httpServer,
        path: '/graphql',
    });
    // const wsPersistedQueries = new WSPersistedQueriesMiddleware();
    // const wsMiddleware = wsPersistedQueries.createMiddleware();
    (0, ws_1.useServer)({
        schema,
        context: auth_js_1.getContext,
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
        logger.info(`Server listening on port ${port}`);
        // Initialize and start Data Retention Service
        const neo4jDriver = (0, neo4j_js_1.getNeo4jDriver)();
        const dataRetentionService = new DataRetentionService_js_1.DataRetentionService(neo4jDriver);
        dataRetentionService.startCleanupJob(); // Start the cleanup job
        (0, hotEmbeddingsRefresh_js_1.startTenantHotEmbeddingsRefresh)();
        (0, evidenceIntegrityJob_js_1.startEvidenceIntegrityJob)();
        // WAR-GAMED SIMULATION - Start Kafka Consumer
        await startKafkaConsumer();
        // Create sample data for development
        if (process.env.NODE_ENV === 'development') {
            setTimeout(async () => {
                try {
                    const { createSampleData } = await Promise.resolve().then(() => __importStar(require('./utils/sampleData.js')));
                    await createSampleData();
                }
                catch (error) {
                    logger.warn('Failed to create sample data, continuing without it');
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
        logger.info(`Shutting down. Signal: ${sig}`);
        await otel_js_1.otelService.shutdown();
        wss.close();
        io.close(); // Close Socket.IO server
        streaming_js_1.streamingRateLimiter.destroy();
        (0, hotEmbeddingsRefresh_js_1.stopTenantHotEmbeddingsRefresh)();
        if (stopKafkaConsumer)
            await stopKafkaConsumer(); // WAR-GAMED SIMULATION - Stop Kafka Consumer
        await Promise.allSettled([
            closeNeo4jDriver(),
            closePostgresPool(),
            closeRedisClient(),
        ]);
        httpServer.close((err) => {
            if (err) {
                logger.error(`Error during shutdown: ${err instanceof Error ? err.message : 'Unknown error'}`);
                process.exitCode = 1;
            }
            process.exit();
        });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
};
startServer();
