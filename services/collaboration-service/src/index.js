"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const collaboration_1 = require("@intelgraph/collaboration");
const stores_1 = require("./stores");
const routes_1 = require("./routes");
const websocket_2 = require("./websocket");
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3010;
const HOST = process.env.HOST || '0.0.0.0';
async function main() {
    const fastify = (0, fastify_1.default)({
        logger: true
    });
    // Register plugins
    await fastify.register(cors_1.default, {
        origin: true,
        credentials: true
    });
    await fastify.register(websocket_1.default);
    // Initialize stores (using in-memory for now, would use DB in production)
    const stores = new stores_1.InMemoryStores();
    // Initialize collaboration hub
    const hub = new collaboration_1.CollaborationHub(stores);
    // Setup REST API routes
    (0, routes_1.setupRoutes)(fastify, hub);
    // Setup WebSocket handler for real-time sync
    const wsHandler = new websocket_2.WebSocketHandler(hub);
    fastify.register(async (fastify) => {
        fastify.get('/ws', { websocket: true }, wsHandler.handleConnection.bind(wsHandler));
    });
    // Health check
    fastify.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });
    // Start server
    try {
        await fastify.listen({ port: PORT, host: HOST });
        console.log(`Collaboration service listening on ${HOST}:${PORT}`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}
main();
