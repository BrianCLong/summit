import { startKafkaConsumer } from './ingest/kafka.js';
import { handleHttpSignal, getIngestStatus } from './ingest/http.js';
import { makePubSub } from './subscriptions/pubsub.js';
import { enforcePersisted } from './middleware/persisted.js';
import { rpsLimiter } from './middleware/rpsLimiter.js';
import { backpressureMiddleware, getTenantRateStatus } from './middleware/backpressure.js';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { registry } from './metrics/registry.js';
import { pg } from './db/pg.js';
import { neo } from './db/neo4j.js';
import { redis } from './subscriptions/pubsub.js';
// Apollo v5 imports
import { createApolloV5Server, createGraphQLMiddleware, createHealthCheck } from './graphql/apollo-v5-server.js';
// OpenTelemetry v2 Bootstrap
import { initializeOTelV2 } from './telemetry/otel-v2-bootstrap.js';
// Initialize OpenTelemetry v2
initializeOTelV2();
console.log("Starting v24 Global Coherence Ecosystem server with Apollo v5...");
const pubsub = makePubSub();
// Create HTTP server for Apollo v5
const app = express();
const httpServer = createServer(app);
// Enhanced CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Apollo-Require-Preflight',
        'X-Tenant-ID',
        'X-User-ID'
    ]
}));
app.use(express.json({ limit: '10mb' }));
app.use(enforcePersisted);
app.use(rpsLimiter);
// Expose Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', registry.contentType);
        res.end(await registry.metrics());
    }
    catch (ex) {
        res.status(500).end(ex);
    }
});
// Health check endpoints
app.get('/health', async (req, res) => {
    const pgHealth = await pg.healthCheck();
    const neoHealth = await neo.healthCheck();
    const redisHealth = await redis.healthCheck();
    const health = {
        status: pgHealth && neoHealth ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
            postgres: pgHealth ? 'healthy' : 'unhealthy',
            neo4j: neoHealth ? 'healthy' : 'unhealthy',
            redis: redisHealth ? 'healthy' : 'degraded' // Redis is optional, degraded if unavailable
        }
    };
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
});
app.get('/health/pg', async (req, res) => {
    const isHealthy = await pg.healthCheck();
    res.status(isHealthy ? 200 : 503).json({
        service: 'postgres',
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
    });
});
app.get('/health/neo4j', async (req, res) => {
    const isHealthy = await neo.healthCheck();
    res.status(isHealthy ? 200 : 503).json({
        service: 'neo4j',
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
    });
});
app.get('/health/redis', async (req, res) => {
    const isHealthy = await redis.healthCheck();
    res.status(isHealthy ? 200 : 200).json({
        service: 'redis',
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString()
    });
});
// Create Apollo v5 server instance
const apolloServer = createApolloV5Server(httpServer);
// Apollo v5 GraphQL health check
app.get('/health/graphql', createHealthCheck(apolloServer));
// Streaming ingest endpoints with backpressure
app.post('/ingest/stream', backpressureMiddleware({ tokensPerSecond: 1000, burstCapacity: 5000 }), handleHttpSignal);
// Ingest status endpoints
app.get('/ingest/status', (req, res) => {
    res.json(getIngestStatus());
});
app.get('/ingest/rate/:tenantId', (req, res) => {
    const tenantId = req.params.tenantId;
    res.json(getTenantRateStatus(tenantId));
});
// Initialize Apollo v5 server
async function startServer() {
    await apolloServer.start();
    // Apply Apollo GraphQL middleware at /graphql
    app.use('/graphql', createGraphQLMiddleware(apolloServer));
    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, () => {
        console.log(`🚀 Apollo v5 Server ready at http://localhost:${PORT}/graphql`);
        console.log(`📊 Metrics endpoint: http://localhost:${PORT}/metrics`);
        console.log(`❤️  Health checks: http://localhost:${PORT}/health`);
        console.log("🔥 OpenTelemetry v2 telemetry active");
        console.log("📈 Metrics collection initialized");
        // Start background services
        startKafkaConsumer();
        // Example signal for testing (commented out)
        // handleHttpSignal({
        //   tenantId: "http-tenant-1",
        //   type: "http_test",
        //   value: 0.85,
        //   weight: 1.0,
        //   source: "http",
        //   ts: new Date().toISOString()
        // });
    });
}
// Graceful shutdown handling
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await apolloServer.stop();
    httpServer.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await apolloServer.stop();
    httpServer.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});
// Start the server
startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
