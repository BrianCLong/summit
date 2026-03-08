"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const cors_1 = __importDefault(require("cors"));
const schema_js_1 = require("./graphql/schema.js");
const resolvers_js_1 = require("./graphql/resolvers.js");
const context_js_1 = require("./graphql/context.js");
const config_js_1 = require("./config.js");
async function createServer() {
    const app = (0, express_1.default)();
    // Middleware
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    // Health check - excluded from rate limiting
    app.get('/health', (_req, res) => {
        res.json({
            status: 'healthy',
            service: 'admin-automation',
            version: config_js_1.config.version,
            timestamp: new Date().toISOString(),
        });
    });
    app.get('/health/ready', (_req, res) => {
        res.json({ ready: true });
    });
    app.get('/health/live', (_req, res) => {
        res.json({ live: true });
    });
    // Metrics endpoint
    app.get('/metrics', (_req, res) => {
        res.json({
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString(),
        });
    });
    // Apollo Server
    const server = new server_1.ApolloServer({
        typeDefs: schema_js_1.typeDefs,
        resolvers: resolvers_js_1.resolvers,
        introspection: config_js_1.config.isDevelopment,
    });
    await server.start();
    app.use('/graphql', (0, express4_1.expressMiddleware)(server, {
        context: context_js_1.createContext,
    }));
    return app;
}
async function startServer() {
    try {
        const app = await createServer();
        app.listen(config_js_1.config.port, () => {
            console.log(`Admin Automation service running on port ${config_js_1.config.port}`);
            console.log(`GraphQL: http://localhost:${config_js_1.config.port}/graphql`);
            console.log(`Health: http://localhost:${config_js_1.config.port}/health`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startServer();
}
