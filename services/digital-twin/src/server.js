"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const pg_1 = require("pg");
const redis_1 = require("redis");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const pino_1 = __importDefault(require("pino"));
const schema_js_1 = require("./api/schema.js");
const resolvers_js_1 = require("./api/resolvers.js");
const TwinService_js_1 = require("./core/TwinService.js");
const TwinRepository_js_1 = require("./core/TwinRepository.js");
const EventBus_js_1 = require("./core/EventBus.js");
const StateEstimator_js_1 = require("./state/StateEstimator.js");
const SimulationEngine_js_1 = require("./simulation/SimulationEngine.js");
const StreamIngestion_js_1 = require("./ingestion/StreamIngestion.js");
const logger = (0, pino_1.default)({ name: 'digital-twin-server' });
const PORT = process.env.PORT ?? 4100;
async function main() {
    // Initialize connections
    const pgPool = new pg_1.Pool({
        connectionString: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/intelgraph',
    });
    const redis = (0, redis_1.createClient)({
        url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    });
    await redis.connect();
    const neo4jDriver = neo4j_driver_1.default.driver(process.env.NEO4J_URI ?? 'bolt://localhost:7687', neo4j_driver_1.default.auth.basic(process.env.NEO4J_USER ?? 'neo4j', process.env.NEO4J_PASSWORD ?? 'devpassword'));
    // Initialize services
    const eventBus = new EventBus_js_1.EventBus((process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','), 'digital-twin-service');
    await eventBus.connect();
    const repository = new TwinRepository_js_1.TwinRepository(pgPool, redis, neo4jDriver);
    const stateEstimator = new StateEstimator_js_1.StateEstimator();
    const twinService = new TwinService_js_1.TwinService(repository, stateEstimator, eventBus);
    const simulationEngine = new SimulationEngine_js_1.SimulationEngine();
    // Initialize stream ingestion
    const ingestion = new StreamIngestion_js_1.StreamIngestion(twinService, eventBus);
    await ingestion.start();
    // Create Apollo Server
    const apollo = new server_1.ApolloServer({
        typeDefs: schema_js_1.typeDefs,
        resolvers: resolvers_js_1.resolvers,
    });
    await apollo.start();
    // Create Express app
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    // Health endpoints
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', service: 'digital-twin' });
    });
    app.get('/health/ready', async (_req, res) => {
        try {
            await pgPool.query('SELECT 1');
            await redis.ping();
            const session = neo4jDriver.session();
            await session.run('RETURN 1');
            await session.close();
            res.json({ status: 'ready' });
        }
        catch (error) {
            res.status(503).json({ status: 'not ready', error: String(error) });
        }
    });
    // GraphQL endpoint
    app.use('/graphql', (0, express4_1.expressMiddleware)(apollo, {
        context: async ({ req }) => ({
            twinService,
            simulationEngine,
            eventBus,
            userId: String(req.headers['x-user-id'] ?? 'system'),
        }),
    }));
    // Start server
    app.listen(PORT, () => {
        logger.info({ port: PORT }, 'Digital Twin service started');
    });
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        logger.info('Shutting down...');
        await ingestion.stop();
        await eventBus.disconnect();
        await redis.quit();
        await neo4jDriver.close();
        await pgPool.end();
        process.exit(0);
    });
}
main().catch((error) => {
    logger.error(error, 'Failed to start server');
    process.exit(1);
});
