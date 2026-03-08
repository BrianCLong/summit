"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const routes_js_1 = require("./api/routes.js");
const TaskQueue_js_1 = require("./queue/TaskQueue.js");
const logger_js_1 = require("./utils/logger.js");
const PORT = parseInt(process.env.PORT || '4020', 10);
const HOST = process.env.HOST || '0.0.0.0';
async function main() {
    const app = (0, fastify_1.default)({
        logger: {
            level: process.env.LOG_LEVEL || 'info',
        },
    });
    // Security middleware
    await app.register(cors_1.default, {
        origin: process.env.CORS_ORIGIN || '*',
    });
    await app.register(helmet_1.default);
    // Initialize task queue
    const taskQueue = new TaskQueue_js_1.TaskQueue({
        redisHost: process.env.REDIS_HOST || 'localhost',
        redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || '4', 10),
    });
    // Register API routes
    await (0, routes_js_1.registerRoutes)(app, taskQueue);
    // Graceful shutdown
    const shutdown = async () => {
        logger_js_1.logger.info('Shutting down...');
        await taskQueue.shutdown();
        await app.close();
        process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    // Start server
    await app.listen({ port: PORT, host: HOST });
    logger_js_1.logger.info({ port: PORT }, 'AI Sandbox service started');
}
main().catch((error) => {
    logger_js_1.logger.error({ error: error.message }, 'Failed to start server');
    process.exit(1);
});
