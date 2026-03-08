"use strict";
/**
 * WebSocket Server Entry Point
 * High-availability WebSocket infrastructure for Summit platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const server_js_1 = require("./server.js");
const config_js_1 = require("./utils/config.js");
const logger_js_1 = require("./utils/logger.js");
async function main() {
    try {
        // Load configuration
        const config = (0, config_js_1.loadConfig)();
        logger_js_1.logger.info({
            nodeId: config.clustering.nodeId,
            port: config.port,
            clustering: config.clustering.enabled,
            persistence: config.persistence.enabled,
        }, 'Starting WebSocket server...');
        // Create and start server
        const server = new server_js_1.WebSocketServer(config);
        await server.start();
        // Graceful shutdown handlers
        const shutdown = async (signal) => {
            logger_js_1.logger.info({ signal }, 'Received shutdown signal');
            try {
                await server.stop();
                process.exit(0);
            }
            catch (error) {
                logger_js_1.logger.error({ error: error.message }, 'Error during shutdown');
                process.exit(1);
            }
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        // Uncaught exception handler
        process.on('uncaughtException', (error) => {
            logger_js_1.logger.error({ error: error.message, stack: error.stack }, 'Uncaught exception');
            shutdown('uncaughtException');
        });
        // Unhandled rejection handler
        process.on('unhandledRejection', (reason, promise) => {
            logger_js_1.logger.error({ reason, promise }, 'Unhandled rejection');
            shutdown('unhandledRejection');
        });
    }
    catch (error) {
        logger_js_1.logger.error({ error: error.message }, 'Failed to start server');
        process.exit(1);
    }
}
main();
