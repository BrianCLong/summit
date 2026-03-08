"use strict";
/**
 * WebSocket Server Setup
 * Configures Socket.IO server with Redis adapter and all middleware
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketServer = void 0;
const http_1 = require("http");
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const ioredis_1 = __importDefault(require("ioredis"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const auth_js_1 = require("./middleware/auth.js");
const rateLimit_js_1 = require("./middleware/rateLimit.js");
const rate_limiter_js_1 = require("./lib/rate-limiter.js");
const ConnectionManager_js_1 = require("./managers/ConnectionManager.js");
const PresenceManager_js_1 = require("./managers/PresenceManager.js");
const RoomManager_js_1 = require("./managers/RoomManager.js");
const MessagePersistence_js_1 = require("./managers/MessagePersistence.js");
const health_js_1 = require("./health.js");
const index_js_1 = require("./handlers/index.js");
const logger_js_1 = require("./utils/logger.js");
const metrics = __importStar(require("./metrics/prometheus.js"));
class WebSocketServer {
    app;
    httpServer;
    io;
    redis;
    redisSub;
    config;
    rateLimiter;
    connectionManager;
    presenceManager;
    roomManager;
    messagePersistence;
    healthChecker;
    constructor(config) {
        this.config = config;
        // Create Express app
        this.app = (0, express_1.default)();
        this.httpServer = (0, http_1.createServer)(this.app);
        // Setup Redis clients
        this.redis = new ioredis_1.default({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            db: config.redis.db || 0,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                logger_js_1.logger.warn({ attempt: times, delay }, 'Redis connection retry');
                return delay;
            },
        });
        this.redisSub = this.redis.duplicate();
        // Initialize managers
        this.rateLimiter = new rate_limiter_js_1.AdaptiveRateLimiter({
            maxTokens: config.rateLimit.burstSize,
            refillRate: config.rateLimit.messageRatePerSecond,
        });
        this.connectionManager = new ConnectionManager_js_1.ConnectionManager();
        this.presenceManager = new PresenceManager_js_1.PresenceManager(this.redis, config.persistence.ttl);
        this.roomManager = new RoomManager_js_1.RoomManager();
        this.messagePersistence = new MessagePersistence_js_1.MessagePersistence(this.redis, config.persistence.ttl, config.persistence.maxMessages);
        // Setup Socket.IO
        this.io = new socket_io_1.Server(this.httpServer, {
            cors: {
                origin: config.cors.origin,
                credentials: config.cors.credentials,
            },
            pingTimeout: config.heartbeat.timeout,
            pingInterval: config.heartbeat.interval,
            maxHttpBufferSize: 1e6, // 1MB
            transports: ['websocket', 'polling'],
        });
        // Setup Redis adapter for clustering
        if (config.clustering.enabled) {
            this.io.adapter((0, redis_adapter_1.createAdapter)(this.redis, this.redisSub));
            logger_js_1.logger.info({ nodeId: config.clustering.nodeId }, 'Redis adapter configured for clustering');
        }
        // Health checker
        this.healthChecker = new health_js_1.HealthChecker(this.redis, this.connectionManager);
        this.setupExpress();
        this.setupMiddleware();
        this.setupEventHandlers();
        this.setupBackgroundTasks();
    }
    setupExpress() {
        // Security
        this.app.use((0, helmet_1.default)());
        this.app.use((0, cors_1.default)(this.config.cors));
        this.app.use(express_1.default.json());
        // Health endpoints
        this.app.get('/health', async (req, res) => {
            const health = await this.healthChecker.check();
            const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
            res.status(statusCode).json(health);
        });
        this.app.get('/health/ready', async (req, res) => {
            const health = await this.healthChecker.check();
            const ready = health.redis.connected && health.status !== 'unhealthy';
            res.status(ready ? 200 : 503).json({ ready });
        });
        this.app.get('/health/live', (req, res) => {
            res.status(200).json({ alive: true });
        });
        // Dev metrics endpoint
        if (process.env.NODE_ENV !== 'production') {
            this.app.get('/_dev/ws-metrics', async (req, res) => {
                try {
                    const jsonMetrics = await metrics.register.getMetricsAsJSON();
                    const relevantNames = [
                        'websocket_active_connections',
                        'websocket_connections_total',
                        'websocket_messages_received_total',
                        'websocket_messages_sent_total',
                        'websocket_messages_dropped_total'
                    ];
                    const snapshot = jsonMetrics
                        .filter(m => relevantNames.includes(m.name))
                        .map(m => ({
                        name: m.name,
                        help: m.help,
                        type: m.type,
                        values: m.values
                    }));
                    res.json(snapshot);
                }
                catch (error) {
                    logger_js_1.logger.error({ error: error.message }, 'Failed to get dev metrics');
                    res.status(500).json({ error: 'Failed to get dev metrics' });
                }
            });
        }
        // Metrics endpoint
        this.app.get('/metrics', async (req, res) => {
            try {
                const metricsData = await metrics.getMetrics();
                res.set('Content-Type', metrics.register.contentType);
                res.end(metricsData);
            }
            catch (error) {
                logger_js_1.logger.error({ error: error.message }, 'Failed to get metrics');
                res.status(500).json({ error: 'Failed to get metrics' });
            }
        });
        // Stats endpoint (debug)
        this.app.get('/stats', (req, res) => {
            const stats = {
                connections: {
                    total: this.connectionManager.getTotalConnections(),
                    byTenant: this.connectionManager.getConnectionsByTenant(),
                    byStatus: this.connectionManager.getConnectionsByStatus(),
                },
                rooms: this.roomManager.getStats(),
                clustering: {
                    enabled: this.config.clustering.enabled,
                    nodeId: this.config.clustering.nodeId,
                },
            };
            res.json(stats);
        });
    }
    setupMiddleware() {
        // Authentication
        this.io.use((0, auth_js_1.createAuthMiddleware)(this.config));
        // Rate limiting
        this.io.use((0, rateLimit_js_1.createRateLimitMiddleware)(this.rateLimiter));
        logger_js_1.logger.info('Middleware configured');
    }
    setupEventHandlers() {
        (0, index_js_1.registerEventHandlers)({
            io: this.io,
            connectionManager: this.connectionManager,
            presenceManager: this.presenceManager,
            roomManager: this.roomManager,
            messagePersistence: this.messagePersistence,
            rateLimiter: this.rateLimiter,
        });
    }
    setupBackgroundTasks() {
        // Cleanup stale connections every 5 minutes
        setInterval(() => {
            const staleThreshold = this.config.heartbeat.timeout * 2;
            this.connectionManager.cleanupStale(staleThreshold);
        }, 5 * 60 * 1000);
        // Cleanup expired persisted messages every hour
        if (this.config.persistence.enabled) {
            setInterval(() => {
                this.messagePersistence.cleanupExpired().catch((error) => {
                    logger_js_1.logger.error({ error: error.message }, 'Failed to cleanup expired messages');
                });
            }, 60 * 60 * 1000);
        }
        logger_js_1.logger.info('Background tasks scheduled');
    }
    async start() {
        return new Promise((resolve, reject) => {
            try {
                this.httpServer.listen(this.config.port, this.config.host, () => {
                    logger_js_1.logger.info({
                        port: this.config.port,
                        host: this.config.host,
                        nodeId: this.config.clustering.nodeId,
                        clustering: this.config.clustering.enabled,
                    }, '🚀 WebSocket server started');
                    resolve();
                });
                this.httpServer.on('error', (error) => {
                    logger_js_1.logger.error({ error: error.message }, 'HTTP server error');
                    reject(error);
                });
            }
            catch (error) {
                logger_js_1.logger.error({ error: error.message }, 'Failed to start server');
                reject(error);
            }
        });
    }
    async stop() {
        logger_js_1.logger.info('Shutting down gracefully...');
        // Stop accepting new connections
        this.io.close();
        // Notify all clients about server restart
        this.io.emit('system:restart', {
            reason: 'Server shutting down',
            reconnectIn: 5000,
        });
        // Wait for clients to disconnect gracefully
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // Close HTTP server
        await new Promise((resolve, reject) => {
            this.httpServer.close((err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
        // Close Redis connections
        await this.redis.quit();
        await this.redisSub.quit();
        // Cleanup rate limiter
        this.rateLimiter.destroy();
        logger_js_1.logger.info('Server shutdown complete');
    }
    getIO() {
        return this.io;
    }
    getConnectionManager() {
        return this.connectionManager;
    }
    getRoomManager() {
        return this.roomManager;
    }
}
exports.WebSocketServer = WebSocketServer;
