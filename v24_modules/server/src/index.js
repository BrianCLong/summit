"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const drainHttpServer_1 = require("@apollo/server/plugin/drainHttpServer");
const ws_1 = require("ws");
const ws_2 = require("graphql-ws/lib/use/ws");
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const schema_js_1 = require("./graphql/schema.js");
const context_js_1 = require("./auth/context.js");
const http_js_1 = require("./ingest/http.js");
const kafka_js_1 = require("./ingest/kafka.js");
const neo4j_js_1 = require("./db/neo4j.js");
const pg_js_1 = require("./db/pg.js");
const redis_js_1 = require("./cache/redis.js");
const metrics_js_1 = require("./observability/metrics.js");
const logger_js_1 = require("./observability/logger.js");
const materializer_js_1 = require("./services/materializer.js");
const environment_js_1 = require("../config/environment.js");
const PORT = environment_js_1.config.PORT || 4000;
const GRAPHQL_PATH = '/graphql';
async function startServer() {
    try {
        // Initialize infrastructure
        logger_js_1.logger.info('Initializing V24 Global Coherence Ecosystem...');
        await (0, neo4j_js_1.initializeDatabase)();
        await (0, pg_js_1.initializePostgres)();
        await (0, redis_js_1.initializeRedis)();
        // Setup observability
        (0, metrics_js_1.setupObservability)();
        // Create HTTP server
        const app = (0, express_1.default)();
        const httpServer = http_1.default.createServer(app);
        // Security middleware
        app.use((0, helmet_1.default)({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                },
            },
            crossOriginEmbedderPolicy: false,
        }));
        app.use((0, compression_1.default)());
        app.use((0, cors_1.default)({
            origin: environment_js_1.config.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true,
        }));
        app.use(express_1.default.json({ limit: '10mb' }));
        app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        // Setup WebSocket server for subscriptions
        const wsServer = new ws_1.WebSocketServer({
            server: httpServer,
            path: GRAPHQL_PATH,
        });
        const serverCleanup = (0, ws_2.useServer)({
            schema: { typeDefs: schema_js_1.typeDefs, resolvers: schema_js_1.resolvers },
            context: context_js_1.createContext,
        }, wsServer);
        // Create Apollo Server
        const server = new server_1.ApolloServer({
            typeDefs: schema_js_1.typeDefs,
            resolvers: schema_js_1.resolvers,
            plugins: [
                (0, drainHttpServer_1.ApolloServerPluginDrainHttpServer)({ httpServer }),
                {
                    async serverWillStart() {
                        return {
                            async drainServer() {
                                await serverCleanup.dispose();
                            },
                        };
                    },
                },
            ],
            formatError: (err) => {
                logger_js_1.logger.error('GraphQL Error', { error: err.message, stack: err.stack });
                return {
                    message: err.message,
                    code: err.extensions?.code || 'INTERNAL_ERROR',
                    path: err.path,
                };
            },
            introspection: environment_js_1.config.NODE_ENV !== 'production',
            includeStacktraceInErrorResponses: environment_js_1.config.NODE_ENV !== 'production',
        });
        await server.start();
        // Setup GraphQL endpoint
        app.use(GRAPHQL_PATH, (0, express4_1.expressMiddleware)(server, {
            context: context_js_1.createContext,
        }));
        // Setup coherence signal ingest endpoints
        (0, http_js_1.setupIngest)(app);
        // Health check endpoint
        app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: environment_js_1.config.APP_VERSION || '1.0.0',
                service: 'v24-coherence-ecosystem',
            });
        });
        // Start background services
        if (environment_js_1.config.KAFKA_ENABLED === 'true') {
            (0, kafka_js_1.startKafkaConsumer)();
        }
        // Start materialization service
        (0, materializer_js_1.startMaterializer)();
        // Start server
        httpServer.listen(PORT, () => {
            logger_js_1.logger.info(`🚀 V24 Global Coherence Ecosystem ready at http://localhost:${PORT}${GRAPHQL_PATH}`);
            logger_js_1.logger.info(`🔌 WebSocket subscriptions ready at ws://localhost:${PORT}${GRAPHQL_PATH}`);
            logger_js_1.logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
        });
        // Graceful shutdown
        const shutdown = async (signal) => {
            logger_js_1.logger.info(`Received ${signal}, shutting down gracefully...`);
            httpServer.close(() => {
                logger_js_1.logger.info('HTTP server closed');
                process.exit(0);
            });
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        logger_js_1.logger.error('Failed to start server', {
            error: error.message,
            stack: error.stack,
        });
        process.exit(1);
    }
}
startServer();
