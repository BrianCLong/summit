"use strict";
/**
 * Data Monetization Engine - Main Entry Point
 *
 * Full-Spectrum Automated Data Monetization Engine
 * AI-powered system for identifying, packaging, and marketing data assets
 * with automated GDPR compliance checks and contract generation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const body_parser_1 = require("body-parser");
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const drainHttpServer_1 = require("@apollo/server/plugin/drainHttpServer");
const schema_js_1 = require("./graphql/schema.js");
const index_js_1 = require("./graphql/resolvers/index.js");
const postgres_js_1 = require("./db/postgres.js");
const logger_js_1 = require("./utils/logger.js");
const PORT = parseInt(process.env.PORT || '4100');
const SERVICE_NAME = 'data-monetization-engine';
async function startServer() {
    logger_js_1.logger.info({ service: SERVICE_NAME }, 'Starting Data Monetization Engine');
    const app = (0, express_1.default)();
    const httpServer = (0, http_1.createServer)(app);
    // Security middleware
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: process.env.NODE_ENV === 'production',
    }));
    // CORS configuration
    app.use((0, cors_1.default)({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Request-ID'],
    }));
    // General middleware
    app.use((0, compression_1.default)());
    app.use((0, body_parser_1.json)({ limit: '10mb' }));
    // Health endpoints
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            service: SERVICE_NAME,
            timestamp: new Date().toISOString(),
        });
    });
    app.get('/health/ready', async (req, res) => {
        const dbHealth = await postgres_js_1.postgresConnection.healthCheck();
        res.json({
            status: dbHealth.status === 'healthy' ? 'ready' : 'not_ready',
            checks: { database: dbHealth },
        });
    });
    // Metrics endpoint
    app.get('/metrics', (req, res) => {
        res.set('Content-Type', 'text/plain');
        res.send(`
# HELP data_monetization_requests_total Total API requests
# TYPE data_monetization_requests_total counter
data_monetization_requests_total{service="${SERVICE_NAME}"} 0

# HELP data_monetization_up Service up status
# TYPE data_monetization_up gauge
data_monetization_up{service="${SERVICE_NAME}"} 1
    `.trim());
    });
    // Create Apollo Server
    const server = new server_1.ApolloServer({
        typeDefs: schema_js_1.typeDefs,
        resolvers: index_js_1.resolvers,
        plugins: [(0, drainHttpServer_1.ApolloServerPluginDrainHttpServer)({ httpServer })],
        formatError: (error) => {
            logger_js_1.logger.error({ error: error.message, path: error.path }, 'GraphQL error');
            return error;
        },
    });
    await server.start();
    // GraphQL endpoint
    app.use('/graphql', (0, express4_1.expressMiddleware)(server, {
        context: async ({ req }) => {
            const requestId = req.headers['x-request-id'] ||
                Math.random().toString(36).substring(2, 15);
            // Extract user from auth header (simplified - use proper JWT verification in production)
            const authHeader = req.headers.authorization;
            let user;
            if (authHeader?.startsWith('Bearer ')) {
                // In production, verify JWT and extract claims
                user = { id: 'user-1', email: 'user@example.com', role: 'admin' };
            }
            const tenantId = req.headers['x-tenant-id'] || 'default';
            return { user, tenantId, requestId };
        },
    }));
    // API info endpoint
    app.get('/api/info', (req, res) => {
        res.json({
            service: SERVICE_NAME,
            version: '0.1.0',
            description: 'Full-Spectrum Automated Data Monetization Engine',
            capabilities: [
                'Automated data asset discovery',
                'Multi-framework compliance checking (GDPR, CCPA, HIPAA, etc.)',
                'AI-powered data valuation',
                'Automated contract generation',
                'Data marketplace operations',
                'Revenue analytics and reporting',
            ],
            endpoints: {
                graphql: '/graphql',
                health: '/health',
                metrics: '/metrics',
            },
        });
    });
    // Connect to database
    try {
        await postgres_js_1.postgresConnection.connect();
    }
    catch (error) {
        logger_js_1.logger.warn({ error }, 'Database connection failed - running in standalone mode');
    }
    // Start server
    httpServer.listen(PORT, () => {
        logger_js_1.logger.info({
            message: 'Data Monetization Engine started',
            port: PORT,
            graphqlPath: '/graphql',
            environment: process.env.NODE_ENV || 'development',
        });
        console.log(`
╔════════════════════════════════════════════════════════════════════╗
║         DATA MONETIZATION ENGINE - STARTED SUCCESSFULLY            ║
╠════════════════════════════════════════════════════════════════════╣
║  GraphQL Playground: http://localhost:${PORT}/graphql                  ║
║  Health Check:       http://localhost:${PORT}/health                   ║
║  API Info:           http://localhost:${PORT}/api/info                 ║
╠════════════════════════════════════════════════════════════════════╣
║  CAPABILITIES:                                                     ║
║  • Automated Data Asset Discovery                                  ║
║  • Multi-Framework Compliance (GDPR, CCPA, HIPAA, etc.)           ║
║  • AI-Powered Data Valuation                                       ║
║  • Automated Contract Generation                                   ║
║  • Data Marketplace Operations                                     ║
║  • Revenue Analytics & Reporting                                   ║
╚════════════════════════════════════════════════════════════════════╝
    `);
    });
    // Graceful shutdown
    const shutdown = async () => {
        logger_js_1.logger.info('Shutting down gracefully...');
        await server.stop();
        httpServer.close(() => {
            logger_js_1.logger.info('Server closed');
            process.exit(0);
        });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
startServer().catch((error) => {
    logger_js_1.logger.error({ error }, 'Failed to start server');
    process.exit(1);
});
