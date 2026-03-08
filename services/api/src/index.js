"use strict";
/**
 * IntelGraph API Service - Main Entry Point
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const app_js_1 = require("./app.js");
const socket_js_1 = require("./realtime/socket.js");
const logger_js_1 = require("./utils/logger.js");
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';
async function startServer() {
    try {
        // Create Express app with GraphQL
        const app = await (0, app_js_1.createApp)();
        // Create HTTP server
        const httpServer = (0, http_1.createServer)(app);
        // Create Socket.IO server for realtime features
        const io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: process.env.ALLOWED_ORIGINS?.split(',') || [
                    'http://localhost:3000',
                ],
                methods: ['GET', 'POST'],
                credentials: true,
            },
        });
        // Initialize Socket.IO handlers
        (0, socket_js_1.createSocketIOServer)(io);
        // Start server
        httpServer.listen(PORT, () => {
            logger_js_1.logger.info({
                message: 'IntelGraph API Server started',
                port: PORT,
                environment: NODE_ENV,
                graphqlPath: '/graphql',
                timestamp: new Date().toISOString(),
            });
        });
        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger_js_1.logger.info('SIGTERM received, shutting down gracefully');
            httpServer.close(() => {
                logger_js_1.logger.info('Process terminated');
                process.exit(0);
            });
        });
    }
    catch (error) {
        logger_js_1.logger.error({
            message: 'Failed to start server',
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        process.exit(1);
    }
}
startServer();
