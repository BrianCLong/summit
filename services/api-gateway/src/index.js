"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@apollo/server");
const express4_1 = require("@as-integrations/express4");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const schema_js_1 = require("./schema.js");
const resolvers_js_1 = require("./resolvers.js");
const policy_js_1 = require("./middleware/policy.js");
const context_js_1 = require("./context.js");
const logger_js_1 = require("./utils/logger.js");
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';
async function startServer() {
    const app = (0, express_1.default)();
    // Security middleware
    // app.use(helmet());
    // app.use(compression());
    app.use((0, cors_1.default)({
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
    }));
    // Policy enforcement middleware
    app.use('/graphql', (0, policy_js_1.policyGuard)({
        dryRun: process.env.POLICY_DRY_RUN === 'true',
    }));
    // Apollo GraphQL Server
    const server = new server_1.ApolloServer({
        typeDefs: schema_js_1.typeDefs,
        resolvers: resolvers_js_1.resolvers,
        introspection: NODE_ENV === 'development',
        logger: logger_js_1.logger,
    });
    await server.start();
    app.use('/graphql', express_1.default.json(), (0, express4_1.expressMiddleware)(server, {
        context: context_js_1.createContext,
    }));
    // Health check - main endpoint
    app.get(['/health', '/api/health'], (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: NODE_ENV,
        });
    });
    // K8s liveness probe
    app.get('/health/live', (req, res) => {
        res.json({ status: 'alive' });
    });
    // K8s readiness probe
    app.get('/health/ready', (req, res) => {
        res.json({ status: 'ready' });
    });
    // Standard K8s health endpoints
    app.get('/healthz', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });
    app.get('/readyz', (req, res) => {
        res.json({
            status: 'ready',
            timestamp: new Date().toISOString(),
        });
    });
    app.listen(PORT, () => {
        logger_js_1.logger.info(`🚀 API Gateway ready at http://localhost:${PORT}/graphql`);
        logger_js_1.logger.info(`🏥 Health check at http://localhost:${PORT}/health`);
    });
}
startServer().catch((error) => {
    logger_js_1.logger.error('Failed to start server:', error);
    process.exit(1);
});
