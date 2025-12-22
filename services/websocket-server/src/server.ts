import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { logger } from './utils/logger.js';
import { ConnectionManager } from './managers/ConnectionManager.js';
import { RoomManager } from './managers/RoomManager.js';
import { MessagePersistence } from './managers/MessagePersistence.js';
import { registerHandlers } from './handlers/index.js';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './types/index.js';

// Configuration
const PORT = process.env.PORT || 9001;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Initialize services
const app = express();
const httpServer = createServer(app);
const redis = new Redis(REDIS_URL);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || '*',
        methods: ['GET', 'POST']
    }
});

// Managers
const connectionManager = new ConnectionManager();
const roomManager = new RoomManager();
const messagePersistence = new MessagePersistence(redis);

// Health check
app.get('/health/live', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/health/ready', async (req, res) => {
    try {
        const redisStatus = await redis.ping();
        res.status(redisStatus === 'PONG' ? 200 : 503).json({
            status: redisStatus === 'PONG' ? 'ready' : 'degraded',
            connections: connectionManager.getTotalConnections()
        });
    } catch (err) {
        res.status(503).json({ status: 'unhealthy', error: String(err) });
    }
});

// Authentication middleware (Simulated for restoration - logic normally checks JWT)
io.use((socket, next) => {
    // In a real implementation this would verify the JWT token
    // For dev restoration we assume the gateway or client passes valid data or we mock it
    const token = socket.handshake.auth.token;
    if (!token && process.env.NODE_ENV !== 'development') {
        return next(new Error('Authentication failed'));
    }

    // Mock user data for now if not present, to prevent crashes
    socket.data.user = socket.data.user || {
        userId: 'user-' + socket.id,
        tenantId: 'default-tenant',
        roles: [],
        permissions: [],
        sub: 'user-' + socket.id,
        iat: Date.now(),
        exp: Date.now() + 3600
    };
    socket.data.connectionId = socket.id;
    socket.data.tenantId = socket.data.user.tenantId;
    socket.data.connectedAt = Date.now();

    next();
});

// Socket connection
io.on('connection', (socket) => {
    logger.info({ connectionId: socket.id }, 'New connection established');
    registerHandlers(socket, connectionManager, roomManager, messagePersistence);
});

// Graceful shutdown
const shutdown = async () => {
    logger.info('Shutting down...');
    io.close(() => {
        logger.info('Socket.IO closed');
    });
    await redis.quit();
    httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
httpServer.listen(PORT, () => {
    logger.info({ port: PORT }, 'WebSocket Server started');
});
